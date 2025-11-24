import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get messages for a project
export const getMessages = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Check if user has access to this project
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

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(args.limit ?? 50);

    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender ? { 
            name: sender.name || sender.email?.split("@")[0] || "Unknown User", 
            email: sender.email 
          } : null,
        };
      })
    );

    return messagesWithSenders.reverse(); // Show oldest first
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("file"), v.literal("image"))),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    replyTo: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has access to this project
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", (q) => 
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Access denied");
    }

    const messageId = await ctx.db.insert("messages", {
      projectId: args.projectId,
      senderId: userId,
      content: args.content,
      type: args.type ?? "text",
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      readBy: [userId], // Sender has read the message
      replyTo: args.replyTo,
    });

    // Check for mentions and create notifications
    const mentionRegex = /@(\S+)/g;
    const mentions = args.content.match(mentionRegex);
    
    if (mentions) {
      for (const mention of mentions) {
        const email = mention.substring(1); // Remove @
        const mentionedUser = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .unique();

        if (mentionedUser && mentionedUser._id !== userId) {
          // Check if mentioned user is in the project
          const mentionedMembership = await ctx.db
            .query("teamMembers")
            .withIndex("by_project_and_user", (q) => 
              q.eq("projectId", args.projectId).eq("userId", mentionedUser._id)
            )
            .unique();

          if (mentionedMembership) {
            await ctx.db.insert("notifications", {
              userId: mentionedUser._id,
              type: "mention",
              title: "You were mentioned",
              message: `${userId} mentioned you in a message`,
              isRead: false,
              relatedProjectId: args.projectId,
              relatedEntityId: messageId,
            });
          }
        }
      }
    }

    return messageId;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (message && !message.readBy.includes(userId)) {
        const updatedReadBy = [...message.readBy, userId];
        await ctx.db.patch(messageId, { readBy: updatedReadBy });
      }
    }

    return true;
  },
});
