import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface TaskBoardProps {
  projectId: string;
  canEdit: boolean;
  teamMembers?: any[]; // Pass team members from parent
}

export function TaskBoard({ projectId, canEdit, teamMembers }: TaskBoardProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    assignedTo: "",
    deadline: "",
  });

  const tasks = useQuery(api.tasks.getTasks, { projectId: projectId as any });
  const createTask = useMutation(api.tasks.createTask);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      await createTask({
        projectId: projectId as any,
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        assignedTo: newTask.assignedTo ? (newTask.assignedTo as any) : undefined,
        deadline: newTask.deadline ? new Date(newTask.deadline).getTime() : undefined,
      });

      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: "",
        deadline: "",
      });
      setShowCreateTask(false);
      toast.success("Task created successfully!");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: "todo" | "in_progress" | "done") => {
    try {
      await updateTaskStatus({ taskId: taskId as any, status: newStatus });
      toast.success("Task status updated!");
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const todoTasks = tasks?.filter(task => task.status === "todo") || [];
  const inProgressTasks = tasks?.filter(task => task.status === "in_progress") || [];
  const doneTasks = tasks?.filter(task => task.status === "done") || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Task Board</h2>
        {canEdit && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Task
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">To Do</h3>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
              {todoTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {todoTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                canEdit={canEdit}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">In Progress</h3>
            <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-sm">
              {inProgressTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                canEdit={canEdit}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </div>

        {/* Done Column */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Done</h3>
            <span className="bg-green-200 text-green-700 px-2 py-1 rounded-full text-sm">
              {doneTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                canEdit={canEdit}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
              <button
                onClick={() => setShowCreateTask(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Task description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to
                </label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {teamMembers?.map((member: any) => (
                    <option key={member.userId} value={member.userId}>
                      {member.profile?.username || member.profile?.email?.split("@")[0] || member.userId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ 
  task, 
  onStatusChange, 
  canEdit, 
  getPriorityColor 
}: { 
  task: any; 
  onStatusChange: (taskId: string, status: "todo" | "in_progress" | "done") => void;
  canEdit: boolean;
  getPriorityColor: (priority: string) => string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        {task.assignee && (
          <span>👤 {task.assignee.name}</span>
        )}
        {task.deadline && (
          <span>📅 {new Date(task.deadline).toLocaleDateString()}</span>
        )}
      </div>

      {canEdit && (
        <div className="flex gap-1">
          {task.status !== "todo" && (
            <button
              onClick={() => onStatusChange(task._id, "todo")}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              To Do
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={() => onStatusChange(task._id, "in_progress")}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              In Progress
            </button>
          )}
          {task.status !== "done" && (
            <button
              onClick={() => onStatusChange(task._id, "done")}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
