// ABOUTME: User dashboard placeholder with logout functionality
// ABOUTME: Will be fully implemented in US-010 (user dashboard with league list)
import { useAuthActions } from "@convex-dev/auth/react";

export function Dashboard() {
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-oche-900 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-tight text-oche-100">
            Dashboard
          </h1>
          <button
            onClick={() => void signOut()}
            className="rounded-md border border-oche-700 px-4 py-2 text-sm text-oche-300 transition hover:bg-oche-800 hover:text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
          >
            Log Out
          </button>
        </div>
        <p className="mt-4 text-oche-400">My Leagues</p>
      </div>
    </div>
  );
}
