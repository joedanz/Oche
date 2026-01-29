// ABOUTME: Individual player leaderboards page with top 10 per category.
// ABOUTME: Categories: highest average, most runs, best plus/minus, most high innings, most wins.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export function LeaderboardsPage({ leagueId }: { leagueId: Id<"leagues"> }) {
  const [seasonId, setSeasonId] = useState<string>("");

  const data = useQuery(api.leaderboards.getLeaderboards, {
    leagueId,
    ...(seasonId ? { seasonId: seasonId as Id<"seasons"> } : {}),
  });

  if (!data) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Leaderboards</h2>

      <div className="mb-6">
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {data.categories.map((category) => (
          <div key={category.name} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">{category.name}</h3>
            {category.entries.length === 0 ? (
              <p className="text-gray-500 text-sm">No data available.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1 pr-2 w-8">#</th>
                    <th className="py-1">Player</th>
                    <th className="py-1 text-gray-400">Team</th>
                    <th className="py-1 text-right font-variant-numeric tabular-nums">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {category.entries.map((entry) => (
                    <tr key={`${entry.rank}-${entry.playerName}`} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2 text-gray-400 font-variant-numeric tabular-nums">
                        {entry.rank}
                      </td>
                      <td className="py-1.5 font-medium">{entry.playerName}</td>
                      <td className="py-1.5 text-gray-400">{entry.teamName}</td>
                      <td className="py-1.5 text-right font-bold font-variant-numeric tabular-nums">
                        {entry.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
