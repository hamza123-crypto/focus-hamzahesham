import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function GlobalFeed() {
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState<"status" | "announcement">("status");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const posts = useQuery(api.globalFeed.getGlobalPosts, { limit: 20 });
  const createPost = useMutation(api.globalFeed.createGlobalPost);
  const toggleLike = useMutation(api.globalFeed.toggleLike);
  const addComment = useMutation(api.globalFeed.addComment);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await createPost({
        content: newPost,
        type: postType,
      });
      setNewPost("");
      toast.success("Post created!");
    } catch (error) {
      toast.error("Failed to create post");
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await toggleLike({ postId: postId as any });
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleCommentChange = (postId: string, content: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: content }));
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      await addComment({
        postId: postId as any,
        content,
      });
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="card p-6">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPostType("status")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                postType === "status"
                  ? "bg-primary-100 text-primary-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Status
            </button>
            <button
              type="button"
              onClick={() => setPostType("announcement")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                postType === "announcement"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Announcement
            </button>
          </div>
          
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`Share a ${postType}...`}
            className="textarea-field"
            rows={3}
          />
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newPost.trim()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts?.map((post) => (
          <div key={post._id} className="card p-6 fade-in">
            {/* Post Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                  {post.author?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {post.author?.name || post.author?.email?.split("@")[0] || "Unknown User"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(post._creationTime).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <span
                className={`badge ${
                  post.type === "announcement"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-primary-100 text-primary-800"
                }`}
              >
                {post.type}
              </span>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Post Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleLike(post._id)}
                className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <span className="text-lg">👍</span>
                <span className="text-sm">{post.likes.length}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                <span className="text-lg">💬</span>
                <span className="text-sm">{post.comments.length}</span>
              </button>
            </div>

            {/* Comments */}
            {post.comments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {post.comments.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {comment.author?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.author?.name || comment.author?.email?.split("@")[0] || "Unknown User"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-800">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  ?
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentInputs[post._id] || ""}
                    onChange={(e) => handleCommentChange(post._id, e.target.value)}
                    placeholder="Write a comment..."
                    className="input-field text-sm"
                  />
                  <button
                    onClick={() => handleAddComment(post._id)}
                    disabled={!commentInputs[post._id]?.trim()}
                    className="btn-primary px-3 py-1.5 text-sm"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {posts?.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600">
              Be the first to share something with the community!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}