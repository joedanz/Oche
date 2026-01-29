// ABOUTME: Form page for creating a new league with name and description.
// ABOUTME: Navigates to dashboard after successful creation.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function CreateLeaguePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const createLeague = useMutation(api.onboarding.createLeague);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("League name is required.");
      return;
    }
    try {
      await createLeague({ name, description });
      navigate("/dashboard");
    } catch {
      setError("Could not create league. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-oche-900 px-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Create a League
        </h1>
        <p className="mt-2 text-oche-400">
          Set up your league and start organizing play.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Thursday Night Darts…"
            />
          </div>
          <div>
            <label
              htmlFor="league-description"
              className="block text-sm font-medium text-oche-300"
            >
              Description
            </label>
            <textarea
              id="league-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="What's this league about…"
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
        </form>
      </div>
    </div>
  );
}
