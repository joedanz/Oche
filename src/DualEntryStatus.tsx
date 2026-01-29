// ABOUTME: Displays the dual score entry status for a game.
// ABOUTME: Shows whether each captain has submitted scores, with links to review discrepancies.

import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface DualEntryStatusProps {
  gameId: Id<"games">;
  leagueId: Id<"leagues">;
  matchId: Id<"matches">;
}

interface ScoreEntry {
  _id: string;
  side: "home" | "visitor";
  status: string;
}

export function DualEntryStatus({ gameId, leagueId, matchId }: DualEntryStatusProps) {
  const entries = useQuery(api.dualEntry.getScoreEntries, { gameId, leagueId }) as
    | ScoreEntry[]
    | undefined
    | null;

  if (!entries || entries.length === 0) return null;

  const homeEntry = entries.find((e) => e.side === "home");
  const visitorEntry = entries.find((e) => e.side === "visitor");
  const status = entries[0]?.status;

  return (
    <div className="mb-3 text-xs flex items-center gap-3">
      <span className="text-gray-400">
        Entries: {homeEntry ? "✓ Home" : "○ Home"} / {visitorEntry ? "✓ Visitor" : "○ Visitor"}
      </span>
      {status === "confirmed" && (
        <span className="text-green-400">Confirmed</span>
      )}
      {status === "discrepancy" && (
        <>
          <span className="text-red-400">Discrepancy</span>
          <Link
            to={`/leagues/${leagueId}/matches/${matchId}/games/${gameId}/review`}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Review
          </Link>
        </>
      )}
      {status === "pending" && (
        <span className="text-yellow-400">Awaiting second entry</span>
      )}
      {status === "resolved" && (
        <span className="text-blue-400">Resolved</span>
      )}
    </div>
  );
}
