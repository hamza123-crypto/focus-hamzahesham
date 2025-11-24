import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get tasks for a project
export const getTasks = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
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

    let tasksQuery = ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));

    if (args.status) {
      tasksQuery = tasksQuery.filter((q) => q.eq(q.field("status"), args.status));
    }

    const tasks = await tasksQuery.collect();

    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        const creator = await ctx.db.get(task.createdBy);
        const assignee = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;

        return {
          ...task,
          creator: creator ? { 
            name: creator.name || creator.email?.split("@")[0] || "Unknown User", 
            email: creator.email 
          } : null,
          assignee: assignee ? { 
            name: assignee.name || assignee.email?.split("@")[0] || "Unknown User", 
            email: assignee.email 
          } : null,
        };
      })
    );

    return tasksWithDetails;
  },
});

// Create a task
export const createTask = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    deadline: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user can create tasks (editor or admin)
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role === "viewer") {
      throw new Error("Insufficient permissions to create tasks");
    }

    // If assigning to someone, verify they're a project member
    if (args.assignedTo) {
      const assigneeMembership = await ctx.db
        .query("teamMembers")
        .withIndex("by_project_and_user", (q) => 
          q.eq("projectId", args.projectId).eq("userId", args.assignedTo!)
        )
        .unique();

      if (!assigneeMembership) {
        throw new Error("Cannot assign task to non-member");
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      assignedTo: args.assignedTo,
      createdBy: userId,
      status: "todo",
      priority: args.priority,
      deadline: args.deadline,
      tags: args.tags,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      projectId: args.projectId,
      actorId: userId,
      actionType: "task_created",
      targetEntity: taskId,
      details: `Created task "${args.title}"`,
    });

    // Notify assignee
    if (args.assignedTo && args.assignedTo !== userId) {
      await ctx.db.insert("notifications", {
        userId: args.assignedTo,
        type: "task_assigned",
        title: "Task Assigned",
        message: `You've been assigned a new task: "${args.title}"`,
        isRead: false,
        relatedProjectId: args.projectId,
        relatedEntityId: taskId,
      });
    }

    return taskId;
  },
});

// Update task status
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Check permissions
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", task.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role === "viewer") {
      throw new Error("Insufficient permissions to update tasks");
    }

    const oldStatus = task.status;
    await ctx.db.patch(args.taskId, { status: args.status });

    // Log activity
    await ctx.db.insert("activityLogs", {
      projectId: task.projectId,
      actorId: userId,
      actionType: args.status === "done" ? "task_completed" : "task_updated",
      targetEntity: args.taskId,
      details: `Changed task status from ${oldStatus} to ${args.status}`,
      metadata: {
        oldValue: oldStatus,
        newValue: args.status,
      },
    });

    return args.taskId;
  },
});

// Update task assignment
export const updateTaskAssignment = mutation({
  args: {
    taskId: v.id("tasks"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Check permissions (admin or editor)
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", task.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role === "viewer") {
      throw new Error("Insufficient permissions to assign tasks");
    }

    // Verify assignee is project member
    if (args.assignedTo) {
      const assigneeMembership = await ctx.db
        .query("teamMembers")
        .withIndex("by_project_and_user", (q) => 
          q.eq("projectId", task.projectId).eq("userId", args.assignedTo!)
        )
        .unique();

      if (!assigneeMembership) {
        throw new Error("Cannot assign task to non-member");
      }
    }

    await ctx.db.patch(args.taskId, { assignedTo: args.assignedTo });

    // Notify new assignee
    if (args.assignedTo && args.assignedTo !== userId) {
      await ctx.db.insert("notifications", {
        userId: args.assignedTo,
        type: "task_assigned",
        title: "Task Assigned",
        message: `You've been assigned to task: "${task.title}"`,
        isRead: false,
        relatedProjectId: task.projectId,
        relatedEntityId: args.taskId,
      });
    }

    return args.taskId;
  },
});
