// ABOUTME: Match scheduling page for creating and viewing league matches.
// ABOUTME: Admin-only form to schedule matches with double-booking prevention.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface SchedulePageProps {
  leagueId: Id<"leagues">;
}

export function SchedulePage({ leagueId }: SchedulePageProps) {
  const matches = useQuery(api.matches.getMatches, { leagueId });
  const teams = useQuery(api.teams.getTeams, { leagueId });
  const seasons = useQuery(api.seasons.getSeasons, { leagueId });
  const createMatch = useMutation(api.matches.createMatch);

  const [homeTeamId, setHomeTeamId] = useState("");
  const [visitorTeamId, setVisitorTeamId] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  if (matches === undefined || teams === undefined || seasons === undefined) {
    return <p>Loading…</p>;
  }

  const activeSeason = seasons.find((s: any) => s.isActive);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (homeTeamId === visitorTeamId) {
      setError("A team cannot play against itself");
      return;
    }

    if (!activeSeason) {
      setError("No active season. Create and activate a season first.");
      return;
    }

    try {
      await createMatch({
        leagueId,
        seasonId: activeSeason._id,
        homeTeamId: homeTeamId as Id<"teams">,
        visitorTeamId: visitorTeamId as Id<"teams">,
        date,
      });
      setHomeTeamId("");
      setVisitorTeamId("");
      setDate("");
    } catch (err: any) {
      setError(err.message || "Failed to create match");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Schedule</h2>
        <Link
          to={`/leagues/${leagueId}/schedule/generate`}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
        >
          Auto-Generate
        </Link>
      </div>

      <form onSubmit={handleCreate} className="mb-6 space-y-3 max-w-md">
        <div>
          <label htmlFor="homeTeam" className="block text-sm font-medium">
            Home Team
          </label>
          <select
            id="homeTeam"
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white text-black"
            required
          >
            <option value="">Select home team…</option>
            {teams.map((t: any) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visitorTeam" className="block text-sm font-medium">
            Visitor Team
          </label>
          <select
            id="visitorTeam"
            value={visitorTeamId}
            onChange={(e) => setVisitorTeamId(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white text-black"
            required
          >
            <option value="">Select visitor team…</option>
            {teams.map((t: any) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="matchDate" className="block text-sm font-medium">
            Date
          </label>
          <input
            id="matchDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white text-black"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Match
        </button>
      </form>

      {matches.length === 0 ? (
        <p className="text-gray-500">No matches scheduled yet.</p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m: any) => (
            <li
              key={m._id}
              className="border rounded p-3 flex justify-between items-center"
            >
              <span>
                <strong>{m.homeTeamName}</strong> vs{" "}
                <strong>{m.visitorTeamName}</strong>
              </span>
              <div className="flex items-center gap-3">
                <Link
                  to={`/leagues/${leagueId}/matches/${m._id}`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Details
                </Link>
                <Link
                  to={`/leagues/${leagueId}/matches/${m._id}/pairings`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Pairings
                </Link>
                <Link
                  to={`/leagues/${leagueId}/matches/${m._id}/score`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Scores
                </Link>
                <Link
                  to={`/leagues/${leagueId}/matches/${m._id}/import-csv`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Import CSV
                </Link>
                <span className="text-sm text-gray-500">{m.date}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
