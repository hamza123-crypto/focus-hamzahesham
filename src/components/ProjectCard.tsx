import { Id } from "../../convex/_generated/dataModel";

interface ProjectCardProps {
  project: any;
  onOpen: () => void;
  showOwner?: boolean;
  showRole?: boolean;
}

export function ProjectCard({ project, onOpen, showOwner, showRole }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="card p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {project.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {project.description}
          </p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <span className={`badge ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          {showRole && project.role && (
            <span className={`badge ${getRoleColor(project.role)}`}>
              {project.role}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {showOwner && project.owner && (
            <span>by {project.owner.username || project.owner.email?.split("@")[0] || "Unknown"}</span>
          )}
          {project.memberCount !== undefined && (
            <span>{project.memberCount} members</span>
          )}
          {project.deadline && (
            <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
          )}
        </div>
        
        <button
          onClick={onOpen}
          className="btn-primary px-4 py-2 text-sm"
        >
          Open
        </button>
      </div>

      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {project.tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="badge bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}