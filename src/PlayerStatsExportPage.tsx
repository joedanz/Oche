// ABOUTME: Page displaying all player stats for a league with CSV and PDF export options.
// ABOUTME: Shows a table of player statistics with season selector and export buttons.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { playerStatsToCsv, playerStatsToPdf, downloadCsv } from "./statsExport";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

export function PlayerStatsExportPage({ leagueId }: { leagueId: Id<"leagues"> }) {
  const { isLoading, canUse } = usePlan();
  const [seasonId, setSeasonId] = useState<string>("");

  const data = useQuery(api.statsExport.getExportData, {
    leagueId,
    ...(seasonId ? { seasonId: seasonId as Id<"seasons"> } : {}),
  });

  if (isLoading) return null;
  if (!canUse("csv_pdf_export")) {
    return <UpgradePrompt message="CSV and PDF export require a League plan or higher." />;
  }

  if (!data) {
    return <div className="p-6">Loading…</div>;
  }

  const seasonName = data.seasons.find((s) => s.id === seasonId)?.name
    ?? data.seasons.find((s) => s.isActive)?.name
    ?? "Active Season";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Player Statistics</h2>

      <div className="flex gap-4 mb-4">
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

      {data.playerStats.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            onClick={() => {
              const csv = playerStatsToCsv(data.playerStats, seasonName);
              downloadCsv(csv, "player-stats.csv");
            }}
          >
            Export CSV
          </button>
          <button
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            onClick={() => {
              playerStatsToPdf(data.playerStats, seasonName);
            }}
          >
            Export PDF
          </button>
        </div>
      )}

      {data.playerStats.length === 0 ? (
        <p className="text-gray-500">No player stats available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left">
                <th className="py-2 px-3">Player</th>
                <th className="py-2 px-3">Team</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>Avg</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>Plus</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>Minus</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>+/−</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>9s</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>W</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>L</th>
                <th className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>GP</th>
              </tr>
            </thead>
            <tbody>
              {data.playerStats.map((stat, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{stat.playerName}</td>
                  <td className="py-2 px-3">{stat.teamName}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.average}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.totalPlus}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.totalMinus}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {stat.plusMinus >= 0 ? `+${stat.plusMinus}` : stat.plusMinus}
                  </td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.highInnings}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.wins}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.losses}</td>
                  <td className="py-2 px-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.gamesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
