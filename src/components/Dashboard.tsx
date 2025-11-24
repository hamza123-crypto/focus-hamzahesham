import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { CreateProjectModal } from "./CreateProjectModal";
import { GlobalFeed } from "./GlobalFeed";
import { ProjectCard } from "./ProjectCard";

interface DashboardProps {
  onOpenProject: (projectId: string) => void;
}

export function Dashboard({ onOpenProject }: DashboardProps) {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "projects">("feed");

  const publicProjects = useQuery(api.projects.getPublicProjects, { limit: 10 });
  const userProjects = useQuery(api.projects.getUserProjects);

  return (
    <div className="max-w-8xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Discover projects and collaborate with teams
          </p>
        </div>
        <button
          onClick={() => setShowCreateProject(true)}
          className="btn-primary px-6 py-2.5"
        >
          Create Project
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === "feed"
              ? "bg-white text-primary-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Global Feed
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === "projects"
              ? "bg-white text-primary-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Projects
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === "feed" ? (
            <div>
              <GlobalFeed />
              
              {/* Public Projects Section */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Public Projects
                </h2>
                <div className="grid gap-4">
                  {publicProjects?.map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onOpen={() => onOpenProject(project._id)}
                      showOwner={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your Projects
              </h2>
              <div className="grid gap-4">
                {userProjects?.map((project) => (
                  project && (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onOpen={() => onOpenProject(project._id)}
                      showRole={true}
                    />
                  )
                ))}
                {userProjects?.length === 0 && (
                  <div className="card p-12 text-center">
                    <div className="text-gray-400 text-5xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No projects yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first project to get started
                    </p>
                    <button
                      onClick={() => setShowCreateProject(true)}
                      className="btn-primary px-4 py-2"
                    >
                      Create Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Your Projects</span>
                <span className="font-medium">{userProjects?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Public Projects</span>
                <span className="font-medium">{publicProjects?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-sm text-gray-600">
              Activity feed coming soon...
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            setShowCreateProject(false);
            toast.success("Project created successfully!");
          }}
        />
      )}
    </div>
  );
}