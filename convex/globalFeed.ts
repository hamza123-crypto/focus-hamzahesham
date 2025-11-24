import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get global posts for social feed
export const getGlobalPosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("globalPosts")
      .order("desc")
      .take(args.limit ?? 20);

    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        
        // Get author information for each comment
        const commentsWithAuthors = await Promise.all(
          post.comments.map(async (comment) => {
            const commentAuthor = await ctx.db.get(comment.authorId);
            return {
              ...comment,
              author: commentAuthor ? { 
                name: commentAuthor.name || commentAuthor.email?.split("@")[0] || "Unknown User", 
                email: commentAuthor.email 
              } : null,
            };
          })
        );
        
        return {
          ...post,
          author: author ? { 
            name: author.name || author.email?.split("@")[0] || "Unknown User", 
            email: author.email 
          } : null,
          comments: commentsWithAuthors,
        };
      })
    );

    return postsWithAuthors;
  },
});

// Create a global post
export const createGlobalPost = mutation({
  args: {
    content: v.string(),
    type: v.union(v.literal("status"), v.literal("announcement")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const postId = await ctx.db.insert("globalPosts", {
      authorId: userId,
      content: args.content,
      type: args.type,
      likes: [],
      comments: [],
    });

    return postId;
  },
});

// Like/unlike a global post
export const toggleLike = mutation({
  args: {
    postId: v.id("globalPosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const hasLiked = post.likes.includes(userId);
    const newLikes = hasLiked
      ? post.likes.filter(id => id !== userId)
      : [...post.likes, userId];

    await ctx.db.patch(args.postId, { likes: newLikes });

    return { liked: !hasLiked, likeCount: newLikes.length };
  },
});

// Add comment to global post
export const addComment = mutation({
  args: {
    postId: v.id("globalPosts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const newComment = {
      authorId: userId,
      content: args.content,
      createdAt: Date.now(),
    };

    const updatedComments = [...post.comments, newComment];
    await ctx.db.patch(args.postId, { comments: updatedComments });

    return newComment;
  },
});

// Global search functionality
export const globalSearch = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal("projects"), v.literal("users"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const searchQuery = args.query.toLowerCase();
    const searchType = args.type ?? "all";

    const results: {
      projects?: any[];
      users?: any[];
    } = {};

    if (searchType === "projects" || searchType === "all") {
      // Search public projects
      const allProjects = await ctx.db.query("projects").collect();
      const matchingProjects = allProjects.filter(project => 
        project.visibility === "public" && (
          project.title.toLowerCase().includes(searchQuery) ||
          project.description.toLowerCase().includes(searchQuery) ||
          (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
        )
      );

      results.projects = await Promise.all(
        matchingProjects.map(async (project) => {
          const owner = await ctx.db.get(project.ownerId);
          return {
            ...project,
            owner: owner ? { name: owner.name, email: owner.email } : null,
          };
        })
      );
    }

    if (searchType === "users" || searchType === "all") {
      // Search users (only return basic info for privacy)
      const allUsers = await ctx.db.query("users").collect();
      const matchingUsers = allUsers.filter(user => 
        user.name?.toLowerCase().includes(searchQuery) ||
        user.email?.toLowerCase().includes(searchQuery)
      );

      results.users = matchingUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
      }));
    }

    return results;
  },
});
