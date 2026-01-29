// ABOUTME: Player statistics page showing summary stats, season selector, and game-by-game history.
// ABOUTME: Displays average, plus/minus, W/L record, high innings, and per-game breakdown.

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Props {
  leagueId: Id<"leagues">;
  playerId: Id<"players">;
}

export function PlayerStatsPage({ leagueId, playerId }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(
    undefined,
  );

  const data = useQuery(api.playerStatsPage.getPlayerPageData, {
    leagueId,
    playerId,
    seasonId: selectedSeasonId as Id<"seasons"> | undefined,
  });

  if (!data) {
    return (
      <div className="p-6 text-oche-300">
        <p>Loading…</p>
      </div>
    );
  }

  const { playerName, teamName, stats, gameHistory, seasons } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-oche-100">{playerName}</h1>
        <p className="text-oche-300">{teamName}</p>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="mb-6">
          <label
            htmlFor="season-select"
            className="block text-sm text-oche-300 mb-1"
          >
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

      {/* Summary stats */}
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Average" value={stats.average.toFixed(2)} />
          <StatCard label="Games Played" value={String(stats.gamesPlayed)} />
          <StatCard label="W-L" value={`${stats.wins}-${stats.losses}`} />
          <StatCard label="Plus" value={String(stats.totalPlus)} />
          <StatCard label="Minus" value={String(stats.totalMinus)} />
          <StatCard
            label="Plus/Minus"
            value={`${stats.totalPlus - stats.totalMinus >= 0 ? "+" : ""}${stats.totalPlus - stats.totalMinus}`}
          />
          <StatCard
            label="High Innings (9s)"
            value={String(stats.highInnings)}
          />
        </div>
      ) : (
        <p className="text-oche-400 mb-8">No stats available for this season.</p>
      )}

      {/* Game-by-game history */}
      <h2 className="text-lg font-semibold text-oche-100 mb-4">
        Game History
      </h2>
      {gameHistory.length === 0 ? (
        <p className="text-oche-400">No games found for this season.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oche-700 text-oche-300">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Opponent</th>
                <th className="text-right py-2 px-2">Plus</th>
                <th className="text-right py-2 px-2">Minus</th>
                <th className="text-right py-2 px-2">Total</th>
                <th className="text-right py-2 px-2">9s</th>
                <th className="text-center py-2 px-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.map((game) => (
                <tr key={game.gameId} className="border-b border-oche-800">
                  <td className="py-2 px-2 text-oche-300">{game.matchDate}</td>
                  <td className="py-2 px-2 text-oche-100">
                    {game.opponentName}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {game.plus}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {game.minus}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {game.total}
                  </td>
                  <td className="py-2 px-2 text-right text-oche-100">
                    {game.highInnings}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <ResultBadge result={game.result} />
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-oche-800 rounded-lg p-4 border border-oche-700">
      <p className="text-xs text-oche-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-oche-100 mt-1">{value}</p>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const styles: Record<string, string> = {
    win: "bg-green-900/50 text-green-400",
    loss: "bg-red-900/50 text-red-400",
    tie: "bg-yellow-900/50 text-yellow-400",
    pending: "bg-oche-700 text-oche-400",
  };
  const labels: Record<string, string> = {
    win: "Win",
    loss: "Loss",
    tie: "Tie",
    pending: "Pending",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[result] ?? styles.pending}`}
    >
      {labels[result] ?? "—"}
    </span>
  );
}
