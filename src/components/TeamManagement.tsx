import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface TeamManagementProps {
  project: any;
}

export function TeamManagement({ project }: TeamManagementProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "editor" | "viewer">("editor");

  const addTeamMember = useMutation(api.projects.addTeamMember);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await addTeamMember({
        projectId: project._id,
        userEmail: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail("");
      setShowAddMember(false);
      toast.success("Team member added successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add team member");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-700";
      case "editor": return "bg-blue-100 text-blue-700";
      case "viewer": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const canManageTeam = project.userRole === "admin";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage project team members and their roles</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowAddMember(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Member
          </button>
        )}
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {project.teamMembers?.map((member: any) => (
          <div key={member.userId} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {member.profile?.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {member.profile?.username || member.profile?.email?.split("@")[0] || "Unknown User"}
                </div>
                <div className="text-sm text-gray-600">
                  User ID: {member.userId}
                </div>
                <div className="text-xs text-gray-500">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                {member.role}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Role Descriptions */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="font-medium text-purple-700">Admin:</span>
            <span className="text-gray-700">Full access - can manage team, tasks, and project settings</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-blue-700">Editor:</span>
            <span className="text-gray-700">Can create and edit tasks, participate in chat and polls</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-gray-700">Viewer:</span>
            <span className="text-gray-700">Read-only access - can view tasks and participate in chat</span>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  User must be registered on the platform
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Read only</option>
                  <option value="editor">Editor - Can edit tasks</option>
                  <option value="admin">Admin - Full access</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
