// ABOUTME: League standings page showing team rankings with tiebreaker sorting.
// ABOUTME: Supports filtering by season and division.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export function StandingsPage({ leagueId }: { leagueId: Id<"leagues"> }) {
  const [seasonId, setSeasonId] = useState<string>("");
  const [divisionId, setDivisionId] = useState<string>("");

  const data = useQuery(api.standings.getStandings, {
    leagueId,
    ...(seasonId ? { seasonId: seasonId as Id<"seasons"> } : {}),
    ...(divisionId ? { divisionId: divisionId as Id<"divisions"> } : {}),
  });

  if (!data) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Standings</h2>

      <div className="flex gap-4 mb-6">
        <select
          className="border rounded px-3 py-2 bg-white"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          aria-label="Season"
        >
          <option value="">Active Season</option>
          {data.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 bg-white"
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          aria-label="Division"
        >
          <option value="">All Divisions</option>
          {data.divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {data.standings.length === 0 ? (
        <p className="text-gray-500">No standings data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left">
                <th className="py-2 px-3 font-variant-numeric tabular-nums">Rank</th>
                <th className="py-2 px-3">Team</th>
                <th className="py-2 px-3 text-right font-variant-numeric tabular-nums">Match Points</th>
                <th className="py-2 px-3 text-right font-variant-numeric tabular-nums">Game Wins</th>
                <th className="py-2 px-3 text-right font-variant-numeric tabular-nums">Runs</th>
                <th className="py-2 px-3 text-right font-variant-numeric tabular-nums">+/−</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((entry) => (
                <tr key={entry.teamId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-variant-numeric tabular-nums">{entry.rank}</td>
                  <td className="py-2 px-3 font-medium">{entry.teamName}</td>
                  <td className="py-2 px-3 text-right font-variant-numeric tabular-nums font-bold">
                    {entry.matchPoints}
                  </td>
                  <td className="py-2 px-3 text-right font-variant-numeric tabular-nums">
                    {entry.gameWins}
                  </td>
                  <td className="py-2 px-3 text-right font-variant-numeric tabular-nums">
                    {entry.totalRunsScored}
                  </td>
                  <td className="py-2 px-3 text-right font-variant-numeric tabular-nums">
                    {entry.plusMinus >= 0 ? `+${entry.plusMinus}` : entry.plusMinus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
