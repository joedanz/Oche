// ABOUTME: Post-signup onboarding page for new users without leagues.
// ABOUTME: Offers Create a League or Join a League options.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type View = "choose" | "create" | "join";

export function OnboardingPage() {
  const [view, setView] = useState<View>("choose");
  const [leagueName, setLeagueName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const createLeague = useMutation(api.onboarding.createLeague);

  async function handleCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!leagueName.trim()) {
      setError("League name is required.");
      return;
    }
    try {
      await createLeague({ name: leagueName });
      navigate("/dashboard");
    } catch {
      setError("Could not create league. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-oche-900 px-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Welcome to Oche
        </h1>
        <p className="mt-2 text-oche-400">
          Get started by creating or joining a league.
        </p>

        {view === "choose" && (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setView("create")}
              className="w-full rounded-md bg-amber-500 px-4 py-3 font-semibold text-oche-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
            >
              Create a League
            </button>
            <button
              onClick={() => setView("join")}
              className="w-full rounded-md border border-oche-700 px-4 py-3 font-semibold text-oche-300 transition hover:bg-oche-800 hover:text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
            >
              Join a League
            </button>
          </div>
        )}

        {view === "create" && (
          <form onSubmit={handleCreateLeague} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="league-name"
                className="block text-sm font-medium text-oche-300"
              >
                League Name
              </label>
              <input
                id="league-name"
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="e.g. Thursday Night Darts…"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-oche-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
            >
              Create League
            </button>
            <button
              type="button"
              onClick={() => {
                setView("choose");
                setError("");
              }}
              className="w-full text-sm text-oche-400 transition hover:text-oche-200"
            >
              Back
            </button>
          </form>
        )}

        {view === "join" && (
          <div className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="invite-code"
                className="block text-sm font-medium text-oche-300"
              >
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="Enter invite code…"
              />
            </div>
            <p className="text-sm text-oche-500">
              Ask your league admin for an invite code.
            </p>
            <button
              type="button"
              onClick={() => setView("choose")}
              className="w-full text-sm text-oche-400 transition hover:text-oche-200"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
