import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchType, setSearchType] = useState<"all" | "projects" | "users">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResults = useQuery(
    api.globalFeed.globalSearch,
    query.length >= 2 ? { query, type: searchType } : "skip"
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search projects, users... (⌘K)"
          className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          🔍
        </div>
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Search Type Filters */}
          <div className="flex gap-1 p-2 border-b border-gray-100">
            {["all", "projects", "users"].map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  searchType === type
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Search Results */}
          <div className="p-2">
            {searchResults?.projects && searchResults.projects.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Projects</h3>
                {searchResults.projects.map((project) => (
                  <div
                    key={project._id}
                    className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="font-medium text-gray-900">{project.title}</div>
                    <div className="text-sm text-gray-600 truncate">
                      {project.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      by {project.owner?.username || project.owner?.email?.split("@")[0] || "Unknown"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults?.users && searchResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Users</h3>
                {searchResults.users.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults && 
             (!searchResults.projects || searchResults.projects.length === 0) &&
             (!searchResults.users || searchResults.users.length === 0) && (
              <div className="p-4 text-center text-gray-500">
                No results found for "{query}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
