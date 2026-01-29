// ABOUTME: Season management page for league admins.
// ABOUTME: Allows creating, listing, and activating seasons within a league.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface SeasonsPageProps {
  leagueId: Id<"leagues">;
}

export function SeasonsPage({ leagueId }: SeasonsPageProps) {
  const seasons = useQuery(api.seasons.getSeasons, { leagueId });
  const createSeason = useMutation(api.seasons.createSeason);
  const activateSeason = useMutation(api.seasons.activateSeason);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  if (seasons === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createSeason({ leagueId, name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
    } finally {
      setCreating(false);
    }
  }

  async function handleActivate(seasonId: Id<"seasons">) {
    await activateSeason({ leagueId, seasonId });
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">Seasons</h2>

      {seasons.length === 0 ? (
        <p className="mb-6 text-oche-400">
          No seasons yet. Create one below.
        </p>
      ) : (
        <ul className="mb-8 space-y-3">
          {seasons.map((season) => (
            <li
              key={season._id}
              className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-4 py-3"
            >
              <div>
                <span className="font-medium text-oche-100">
                  {season.name}
                </span>
                <span className="ml-3 text-sm text-oche-400">
                  {season.startDate} – {season.endDate}
                </span>
                {season.isActive && (
                  <span className="ml-3 rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-medium text-green-400">
                    Active
                  </span>
                )}
              </div>
              {!season.isActive && (
                <button
                  onClick={() => handleActivate(season._id as Id<"seasons">)}
                  className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                >
                  Set Active
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-oche-200">
          Create Season
        </h3>

        <div>
          <label
            htmlFor="seasonName"
            className="block text-sm font-medium text-oche-300"
          >
            Season name
          </label>
          <input
            id="seasonName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring 2026…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-oche-300"
          >
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-oche-300"
          >
            End date
          </label>
          <input
            id="endDate"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Season"}
        </button>
      </form>
    </div>
  );
}
