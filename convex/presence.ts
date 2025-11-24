import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Update user presence
export const updatePresence = mutation({
  args: {
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
    currentProject: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if presence record exists
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const presenceData = {
      userId,
      status: args.status,
      lastSeen: Date.now(),
      currentProject: args.currentProject,
    };

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, presenceData);
    } else {
      await ctx.db.insert("userPresence", presenceData);
    }

    return true;
  },
});

// Get presence for project members
export const getProjectPresence = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get project members
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const presenceData = await Promise.all(
      teamMembers.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        const presence = await ctx.db
          .query("userPresence")
          .withIndex("by_user", (q) => q.eq("userId", member.userId))
          .unique();

        return {
          userId: member.userId,
          user: user ? { 
            name: user.name || user.email?.split("@")[0] || "Unknown User", 
            email: user.email 
          } : null,
          status: presence?.status ?? "offline",
          lastSeen: presence?.lastSeen ?? 0,
          isInProject: presence?.currentProject === args.projectId,
        };
      })
    );

    return presenceData;
  },
});

// Heartbeat to maintain online status
export const heartbeat = mutation({
  args: {
    currentProject: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const presenceData = {
      userId,
      status: "online" as const,
      lastSeen: Date.now(),
      currentProject: args.currentProject,
    };

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, presenceData);
    } else {
      await ctx.db.insert("userPresence", presenceData);
    }

    return true;
  },
});

// Clean up offline users (called periodically)
export const cleanupOfflineUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    const allPresence = await ctx.db.query("userPresence").collect();
    
    for (const presence of allPresence) {
      if (presence.lastSeen < fiveMinutesAgo && presence.status !== "offline") {
        await ctx.db.patch(presence._id, { status: "offline" });
      }
    }

    return true;
  },
});
