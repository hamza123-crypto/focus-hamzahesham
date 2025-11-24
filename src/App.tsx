import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ProjectWorkspace } from "./components/ProjectWorkspace";
import { GlobalSearch } from "./components/GlobalSearch";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "project">("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("project");
  };

  const backToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedProjectId(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 shadow-sm px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={backToDashboard}
            className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
          >
            Focus
          </button>
          <Authenticated>
            <GlobalSearch />
          </Authenticated>
        </div>
        <SignOutButton />
      </header>
      
      <main className="flex-1">
        <Content 
          currentView={currentView}
          selectedProjectId={selectedProjectId}
          onOpenProject={openProject}
          onBackToDashboard={backToDashboard}
        />
      </main>
      
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </div>
  );
}

function Content({ 
  currentView, 
  selectedProjectId, 
  onOpenProject, 
  onBackToDashboard 
}: {
  currentView: "dashboard" | "project";
  selectedProjectId: string | null;
  onOpenProject: (projectId: string) => void;
  onBackToDashboard: () => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Authenticated>
        {currentView === "dashboard" ? (
          <Dashboard onOpenProject={onOpenProject} />
        ) : selectedProjectId ? (
          <ProjectWorkspace 
            projectId={selectedProjectId} 
            onBack={onBackToDashboard}
          />
        ) : (
          <Dashboard onOpenProject={onOpenProject} />
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[600px] p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-primary-600 mb-4">Welcome to Focus</h1>
              <p className="text-xl text-gray-600">
                The collaborative social platform for teams
              </p>
              <p className="text-gray-500 mt-2">
                Create projects, build teams, and collaborate in real-time
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}