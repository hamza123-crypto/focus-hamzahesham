import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get polls for a project
export const getPolls = query({
  args: {
    projectId: v.id("projects"),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Check access - require membership for private projects
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    // For private projects, require membership
    if (!membership && project.visibility === "private") {
      return [];
    }

    let pollsQuery = ctx.db
      .query("polls")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    const polls = await pollsQuery.collect();

    const filteredPolls = args.activeOnly 
      ? polls.filter(poll => poll.isActive && (!poll.deadline || poll.deadline > Date.now()))
      : polls;

    const pollsWithCreators = await Promise.all(
      filteredPolls.map(async (poll) => {
        const creator = await ctx.db.get(poll.createdBy);
        return {
          ...poll,
          creator: creator ? { 
            name: creator.name || creator.email?.split("@")[0] || "Unknown User", 
            email: creator.email 
          } : null,
          hasVoted: poll.voters.includes(userId),
        };
      })
    );

    return pollsWithCreators;
  },
});

// Create a poll
export const createPoll = mutation({
  args: {
    projectId: v.id("projects"),
    question: v.string(),
    options: v.array(v.string()),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check permissions (editor or admin)
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role === "viewer") {
      throw new Error("Insufficient permissions to create polls");
    }

    if (args.options.length < 2) {
      throw new Error("Poll must have at least 2 options");
    }

    const pollOptions = args.options.map((text, index) => ({
      id: `option_${index}`,
      text,
      votes: 0,
    }));

    const pollId = await ctx.db.insert("polls", {
      projectId: args.projectId,
      createdBy: userId,
      question: args.question,
      options: pollOptions,
      voters: [],
      deadline: args.deadline,
      isActive: true,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      projectId: args.projectId,
      actorId: userId,
      actionType: "poll_created",
      targetEntity: pollId,
      details: `Created poll: "${args.question}"`,
    });

    // Notify team members
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const member of teamMembers) {
      if (member.userId !== userId) {
        await ctx.db.insert("notifications", {
          userId: member.userId,
          type: "poll_created",
          title: "New Poll Created",
          message: `New poll: "${args.question}"`,
          isRead: false,
          relatedProjectId: args.projectId,
          relatedEntityId: pollId,
        });
      }
    }

    return pollId;
  },
});

// Vote on a poll
export const vote = mutation({
  args: {
    pollId: v.id("polls"),
    optionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    // Check if poll is active
    if (!poll.isActive || (poll.deadline && poll.deadline < Date.now())) {
      throw new Error("Poll is no longer active");
    }

    // Check if user already voted
    if (poll.voters.includes(userId)) {
      throw new Error("You have already voted on this poll");
    }

    // Check access to project
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", poll.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Access denied");
    }

    // Find the option and increment vote count
    const updatedOptions = poll.options.map(option => 
      option.id === args.optionId 
        ? { ...option, votes: option.votes + 1 }
        : option
    );

    const optionExists = poll.options.some(option => option.id === args.optionId);
    if (!optionExists) {
      throw new Error("Invalid option");
    }

    // Update poll with new vote
    await ctx.db.patch(args.pollId, {
      options: updatedOptions,
      voters: [...poll.voters, userId],
    });

    return { success: true, optionId: args.optionId };
  },
});

// Close a poll
export const closePoll = mutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    // Check if user is the creator or admin
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", poll.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || (poll.createdBy !== userId && membership.role !== "admin")) {
      throw new Error("Only poll creator or project admin can close polls");
    }

    await ctx.db.patch(args.pollId, { isActive: false });

    return args.pollId;
  },
});
