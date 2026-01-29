// ABOUTME: Multi-game match score entry page showing all games with individual scoring grids.
// ABOUTME: Supports collapse/expand per game, overall match totals, and links back to schedule.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { ScoringGrid } from "./ScoringGrid";

interface MatchScoreEntryPageProps {
  matchId: Id<"matches">;
  leagueId: Id<"leagues">;
}

export function MatchScoreEntryPage({ matchId, leagueId }: MatchScoreEntryPageProps) {
  const data = useQuery(api.matchDetail.getMatchDetail, { matchId, leagueId });
  const [collapsedGames, setCollapsedGames] = useState<Set<string>>(new Set());

  if (data === undefined) {
    return <p>Loading…</p>;
  }

  if (data === null) {
    return <p>Match not found.</p>;
  }

  const { match, homeTeamName, visitorTeamName, pairings, games } = data;

  const toggleGame = (gameId: string) => {
    setCollapsedGames((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  // Build a map from slot to pairing for player name lookup
  const pairingBySlot = new Map<number, { homePlayerName: string; visitorPlayerName: string }>();
  for (const p of pairings) {
    pairingBySlot.set(p.slot, { homePlayerName: p.homePlayerName, visitorPlayerName: p.visitorPlayerName });
  }

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
        {homeTeamName} vs {visitorTeamName}
      </h2>
      <p className="text-sm text-gray-400 mb-6">{match.date}</p>

      {games.length === 0 ? (
        <p>No games found for this match. Set up pairings first.</p>
      ) : (
        <>
          <div className="space-y-4">
            {games.map((game: any) => {
              const pairing = pairingBySlot.get(game.slot);
              const isCollapsed = collapsedGames.has(game._id);
              return (
                <div key={game._id} className="border border-gray-700 rounded">
                  <button
                    onClick={() => toggleGame(game._id)}
                    className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-800/50"
                  >
                    <span className="font-semibold">
                      Game {game.slot}: {pairing?.homePlayerName ?? "TBD"} vs{" "}
                      {pairing?.visitorPlayerName ?? "TBD"}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="px-4 pb-4">
                      <ScoringGrid
                        gameId={game._id}
                        leagueId={leagueId}
                        homePlayerName={pairing?.homePlayerName ?? "Home"}
                        visitorPlayerName={pairing?.visitorPlayerName ?? "Visitor"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Match Totals */}
          <div className="mt-6 border border-gray-700 rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Match Totals</h3>
            {match.totals ? (
              <div className="space-y-1">
                <p>
                  {homeTeamName}: <strong>{match.totals.homePlus}</strong>
                </p>
                <p>
                  {visitorTeamName}: <strong>{match.totals.visitorPlus}</strong>
                </p>
                {match.totals.bonusWinner && (
                  <p className="text-sm text-yellow-400">
                    Bonus:{" "}
                    {match.totals.bonusWinner === "home" ? homeTeamName : visitorTeamName}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Totals will appear once scores are submitted.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
