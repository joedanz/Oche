// ABOUTME: Match detail page displaying teams, date, pairings, game results, and totals.
// ABOUTME: Read-only view of all match information for any league member.

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface MatchDetailPageProps {
  matchId: Id<"matches">;
  leagueId: Id<"leagues">;
}

export function MatchDetailPage({ matchId, leagueId }: MatchDetailPageProps) {
  const data = useQuery(api.matchDetail.getMatchDetail, { matchId, leagueId });

  if (data === undefined) {
    return <p>Loading…</p>;
  }

  if (data === null) {
    return <p>Match not found.</p>;
  }

  const { match, homeTeamName, visitorTeamName, pairings, games } = data;

  return (
    <div>
      <div className="mb-4">
        <Link
          to={`/leagues/${leagueId}/schedule`}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Schedule
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-1">
        <span>{homeTeamName}</span> vs <span>{visitorTeamName}</span>
      </h2>
      <p className="text-sm text-gray-400 mb-4">{match.date}</p>

      {/* Pairings */}
      {pairings.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Pairings</h3>
          <div className="space-y-2">
            {pairings.map((p: any) => (
              <div
                key={p.slot}
                className="border rounded p-2 flex justify-between items-center"
              >
                <span className="text-sm text-gray-400">Game {p.slot}</span>
                <span>
                  {p.homePlayerName} vs {p.visitorPlayerName}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Game Results */}
      {games.length > 0 && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <div className="space-y-2">
            {games.map((g: any) => (
              <div
                key={g._id}
                className="border rounded p-2 flex justify-between items-center"
              >
                <span className="text-sm text-gray-400">Game {g.slot}</span>
                <span>
                  {g.winner === "home"
                    ? `${homeTeamName} wins`
                    : g.winner === "visitor"
                      ? `${visitorTeamName} wins`
                      : g.winner === "tie"
                        ? "Tie"
                        : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Match Totals */}
      {match.totals && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Match Totals</h3>
          <div className="border rounded p-3 space-y-1">
            <p>
              {homeTeamName}: <strong>{match.totals.homePlus}</strong>
            </p>
            <p>
              {visitorTeamName}: <strong>{match.totals.visitorPlus}</strong>
            </p>
            {match.totals.bonusWinner && (
              <p className="text-sm text-yellow-400">
                Bonus:{" "}
                {match.totals.bonusWinner === "home"
                  ? homeTeamName
                  : visitorTeamName}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
