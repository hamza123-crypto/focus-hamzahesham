import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="btn-secondary px-4 py-2 text-sm font-medium"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}