import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Utility: get user info by userId
async function getUserInfo(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  return user || null;
}

// Utility: find user by email from auth system
async function findUserByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  // Query auth users using the users table
  const users = await ctx.db.query("users").collect();
  const user = users.find(u => u.email === email);
  return user || null;
}

// ----------------------------------------------
// 🔵 Get Public Projects
// ----------------------------------------------
export const getPublicProjects = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(args.limit ?? 20);

    const result = await Promise.all(
      projects.map(async (p) => {
        const ownerUser = await getUserInfo(ctx, p.ownerId);

        const memberCount = await ctx.db
          .query("teamMembers")
          .withIndex("by_project", q => q.eq("projectId", p._id))
          .collect()
          .then(m => m.length);

        return {
          ...p,
          owner: ownerUser
            ? {
                username: ownerUser.name || ownerUser.email?.split("@")[0] || "Unknown",
                avatar: ownerUser.image || null,
              }
            : null,
          memberCount,
        };
      })
    );

    return result;
  },
});

// ----------------------------------------------
// 🔵 User Projects
// ----------------------------------------------
export const getUserProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner", q => q.eq("ownerId", userId))
      .collect();

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    const asMember = await Promise.all(
      memberships.map(async (m) => {
        const p = await ctx.db.get(m.projectId);
        return p ? { ...p, role: m.role } : null;
      })
    );

    return [
      ...owned.map(p => ({ ...p, role: "admin" })),
      ...asMember.filter(Boolean),
    ];
  },
});

// ----------------------------------------------
// 🔵 Create Project
// ----------------------------------------------
export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    deadline: v.optional(v.number()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      ownerId: userId,
      title: args.title,
      description: args.description,
      deadline: args.deadline,
      status: "active",
      visibility: args.visibility,
      tags: args.tags,
    });

    await ctx.db.insert("teamMembers", {
      projectId,
      userId,
      role: "admin",
      invitedBy: userId,
      joinedAt: Date.now(),
    });

    return projectId;
  },
});

// ----------------------------------------------
// 🔵 Get Project Details
// ----------------------------------------------
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", q =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    // Allow access to public projects even without membership
    // For private projects, require membership
    if (!membership && project.visibility === "private") {
      return null; // Return null instead of throwing error
    }

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();

    const membersWithProfiles = await Promise.all(
      members.map(async (m) => {
        const user = await getUserInfo(ctx, m.userId);

        return {
          ...m,
          profile: user
            ? {
                username: user.name || user.email?.split("@")[0] || "Unknown",
                avatar: user.image || null,
              }
            : null,
        };
      })
    );

    return {
      ...project,
      teamMembers: membersWithProfiles,
      userRole: membership?.role || null,
    };
  },
});

// ----------------------------------------------
// 🔵 Add Team Member (via email)
// ----------------------------------------------
export const addTeamMember = mutation({
  args: {
    projectId: v.id("projects"),
    userEmail: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", q =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can add members");
    }

    // Find user by email in auth system
    const targetUser = await findUserByEmail(ctx, args.userEmail);
    if (!targetUser) {
      throw new Error("User not found. They must register first.");
    }

    const exists = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", q =>
        q.eq("projectId", args.projectId).eq("userId", targetUser._id)
      )
      .unique();

    if (exists) throw new Error("User already in team");

    const membershipId = await ctx.db.insert("teamMembers", {
      projectId: args.projectId,
      userId: targetUser._id,
      role: args.role,
      invitedBy: userId,
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});

// ----------------------------------------------
// 🔵 Update Project Status
// ----------------------------------------------
export const updateProjectStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_project_and_user", q =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can update status");
    }

    await ctx.db.patch(args.projectId, { status: args.status });

    return args.projectId;
  },
});
