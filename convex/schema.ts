import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Global posts for social feed
  globalPosts: defineTable({
    authorId: v.id("users"),
    content: v.string(),
    type: v.union(v.literal("status"), v.literal("announcement")),
    likes: v.array(v.id("users")),
    comments: v.array(v.object({
      authorId: v.id("users"),
      content: v.string(),
      createdAt: v.number(),
    })),
  }).index("by_author", ["authorId"]),

  // Projects (publicly visible by default)
  projects: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.string(),
    deadline: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
    visibility: v.union(v.literal("public"), v.literal("private")),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_visibility", ["visibility"]),

  // Team members with RBAC
  teamMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    invitedBy: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),

  // Real-time chat messages
  messages: defineTable({
    projectId: v.id("projects"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.union(v.literal("text"), v.literal("file"), v.literal("image"), v.literal("system_alert")),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    readBy: v.array(v.id("users")),
    replyTo: v.optional(v.id("messages")),
  })
    .index("by_project", ["projectId"])
    .index("by_sender", ["senderId"]),

  // User presence tracking
  userPresence: defineTable({
    userId: v.id("users"),
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
    lastSeen: v.number(),
    currentProject: v.optional(v.id("projects")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Tasks for project management
  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    deadline: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assignedTo"])
    .index("by_status", ["status"]),

  // Collaborative whiteboard data
  whiteboards: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    data: v.string(), // JSON blob for canvas state
    lastModifiedBy: v.id("users"),
    version: v.number(),
  })
    .index("by_project", ["projectId"]),

  // Polls for team decisions
  polls: defineTable({
    projectId: v.id("projects"),
    createdBy: v.id("users"),
    question: v.string(),
    options: v.array(v.object({
      id: v.string(),
      text: v.string(),
      votes: v.number(),
    })),
    voters: v.array(v.id("users")), // Prevent double voting
    deadline: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_project", ["projectId"])
    .index("by_creator", ["createdBy"]),

  // Activity log for project timeline
  activityLogs: defineTable({
    projectId: v.id("projects"),
    actorId: v.id("users"),
    actionType: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("poll_created"),
      v.literal("whiteboard_updated"),
      v.literal("file_uploaded")
    ),
    targetEntity: v.string(), // ID of the affected entity
    details: v.optional(v.string()), // Additional context
    metadata: v.optional(v.object({
      oldValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
    })),
  })
    .index("by_project", ["projectId"])
    .index("by_actor", ["actorId"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("mention"),
      v.literal("task_assigned"),
      v.literal("project_invite"),
      v.literal("poll_created"),
      v.literal("deadline_reminder")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedProjectId: v.optional(v.id("projects")),
    relatedEntityId: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
