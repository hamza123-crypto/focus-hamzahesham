import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { TaskBoard } from "./TaskBoard";
import { Chat } from "./Chat";
import { TeamManagement } from "./TeamManagement";
import { PollsSection } from "./PollsSection";

interface ProjectWorkspaceProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectWorkspace({ projectId, onBack }: ProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "chat" | "team" | "polls">("tasks");
  const [error, setError] = useState<string | null>(null);
  
  const project = useQuery(api.projects.getProject, { projectId: projectId as any });
  const updatePresence = useMutation(api.presence.updatePresence);
  const heartbeat = useMutation(api.presence.heartbeat);

  // Update presence when entering project
  useEffect(() => {
    if (!projectId) return;
    
    updatePresence({ 
      status: "online", 
      currentProject: projectId as any 
    }).catch((err) => {
      console.error("Failed to update presence:", err);
    });

    // Set up heartbeat
    const interval = setInterval(() => {
      heartbeat({ currentProject: projectId as any }).catch((err) => {
        console.error("Heartbeat failed:", err);
      });
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      updatePresence({ status: "online" }).catch((err) => {
        console.error("Failed to clear presence:", err);
      });
    };
  }, [projectId, updatePresence, heartbeat]);

  if (project === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canEdit = project.userRole === "admin" || project.userRole === "editor";

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            project.status === "active" ? "bg-green-100 text-green-700" :
            project.status === "completed" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-700"
          }`}>
            {project.status}
          </span>
          {project.userRole && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              project.userRole === "admin" ? "bg-purple-100 text-purple-700" :
              project.userRole === "editor" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {project.userRole}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "tasks"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "team"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Team
        </button>
        <button
          onClick={() => setActiveTab("polls")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === "polls"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Polls
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 min-h-[600px]">
        {activeTab === "tasks" && (
          <TaskBoard 
            projectId={projectId} 
            canEdit={canEdit} 
            teamMembers={project.teamMembers}
          />
        )}
        {activeTab === "chat" && (
          <Chat projectId={projectId} />
        )}
        {activeTab === "team" && (
          <TeamManagement project={project} />
        )}
        {activeTab === "polls" && (
          <PollsSection projectId={projectId} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}
