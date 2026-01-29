// ABOUTME: Team statistics page showing aggregate stats and roster with per-player stats.
// ABOUTME: Displays game wins, runs scored/allowed, match points, plus/minus, and season selector.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Props {
  leagueId: Id<"leagues">;
  teamId: Id<"teams">;
}

export function TeamStatsPage({ leagueId, teamId }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(
    undefined,
  );

  const data = useQuery(api.teamStats.getTeamStats, {
    leagueId,
    teamId,
    seasonId: selectedSeasonId as Id<"seasons"> | undefined,
  });

  if (!data) {
    return (
      <div className="p-6 text-oche-300">
        <p>Loading…</p>
      </div>
    );
  }

  const { teamName, gameWins, totalRunsScored, totalRunsAllowed, matchPoints, teamPlusMinus, seasons, roster } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-oche-100 mb-6">{teamName}</h1>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="mb-6">
          <label htmlFor="season-select" className="block text-sm text-oche-300 mb-1">
            Season
          </label>
          <select
            id="season-select"
            className="bg-oche-800 text-oche-100 border border-oche-600 rounded px-3 py-2"
            value={
              selectedSeasonId ??
              seasons.find((s) => s.isActive)?.id ??
              seasons[0]?.id ??
              ""
            }
            onChange={(e) => setSelectedSeasonId(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team aggregate stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Match Points" value={String(matchPoints)} />
        <StatCard label="Game Wins" value={String(gameWins)} />
        <StatCard label="Runs Scored" value={String(totalRunsScored)} />
        <StatCard label="Runs Allowed" value={String(totalRunsAllowed)} />
        <StatCard
          label="Plus/Minus"
          value={`${teamPlusMinus >= 0 ? "+" : ""}${teamPlusMinus}`}
        />
      </div>

      {/* Roster with per-player stats */}
      <h2 className="text-lg font-semibold text-oche-100 mb-4">Roster</h2>
      {roster.length === 0 ? (
        <p className="text-oche-400">No players on this team.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oche-700 text-oche-300">
                <th className="text-left py-2 px-2">Player</th>
                <th className="text-right py-2 px-2">GP</th>
                <th className="text-right py-2 px-2">W-L</th>
                <th className="text-right py-2 px-2">Avg</th>
                <th className="text-right py-2 px-2">Plus</th>
                <th className="text-right py-2 px-2">Minus</th>
                <th className="text-right py-2 px-2">+/−</th>
                <th className="text-right py-2 px-2">9s</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => (
                <tr key={player.playerId} className="border-b border-oche-800">
                  <td className="py-2 px-2 text-oche-100">{player.name}</td>
                  <td className="py-2 px-2 text-right text-oche-100">{player.gamesPlayed}</td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {player.wins}-{player.losses}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {player.average.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">{player.totalPlus}</td>
                  <td className="py-2 px-2 text-right text-oche-100">{player.totalMinus}</td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {player.totalPlus - player.totalMinus >= 0 ? "+" : ""}
                    {player.totalPlus - player.totalMinus}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">{player.highInnings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-oche-800 rounded-lg p-4 border border-oche-700">
      <p className="text-xs text-oche-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-oche-100 mt-1 font-variant-numeric tabular-nums">{value}</p>
    </div>
  );
}
