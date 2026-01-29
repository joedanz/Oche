// ABOUTME: Tournament match scoring with automatic bracket advancement.
// ABOUTME: Records winners for bracket matches and advances them to the next round.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

interface BracketMatch {
  matchIndex: number;
  round: number;
  participant1Id: string | null;
  participant1Name: string | null;
  participant1Seed: number | null;
  participant2Id: string | null;
  participant2Name: string | null;
  participant2Seed: number | null;
  winnerId: string | null;
}

export async function recordTournamentMatchResultHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    tournamentId: Id<"tournaments">;
    matchIndex: number;
    winnerId: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const tournament = await ctx.db.get(args.tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const bracket: BracketMatch[] = tournament.bracket as BracketMatch[];
  const match = bracket.find((m) => m.matchIndex === args.matchIndex);
  if (!match) throw new Error("Match not found in bracket");

  if (
    args.winnerId !== match.participant1Id &&
    args.winnerId !== match.participant2Id
  ) {
    throw new Error("Winner is not a participant in this match");
  }

  // Record winner
  match.winnerId = args.winnerId;

  // Determine winner's name and seed
  const isP1 =
    args.winnerId === match.participant1Id;
  const winnerName = isP1 ? match.participant1Name : match.participant2Name;
  const winnerSeed = isP1 ? match.participant1Seed : match.participant2Seed;

  // Advance winner to next round if not the final
  const isFinal = match.round === tournament.rounds;

  if (!isFinal) {
    // Find the position of this match within its round
    const roundMatches = bracket
      .filter((m) => m.round === match.round)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    const positionInRound = roundMatches.findIndex(
      (m) => m.matchIndex === match.matchIndex,
    );

    // Next round match index
    const nextRoundMatches = bracket
      .filter((m) => m.round === match.round + 1)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    const nextMatch = nextRoundMatches[Math.floor(positionInRound / 2)];

    if (nextMatch) {
      // Even position → participant1, odd position → participant2
      if (positionInRound % 2 === 0) {
        nextMatch.participant1Id = args.winnerId;
        nextMatch.participant1Name = winnerName;
        nextMatch.participant1Seed = winnerSeed;
      } else {
        nextMatch.participant2Id = args.winnerId;
        nextMatch.participant2Name = winnerName;
        nextMatch.participant2Seed = winnerSeed;
      }
    }
  }

  // Determine tournament status
  let status: "pending" | "in_progress" | "completed" = tournament.status as any;
  if (isFinal && match.winnerId) {
    status = "completed";
  } else if (bracket.some((m) => m.winnerId !== null)) {
    status = "in_progress";
  }

  await ctx.db.patch(args.tournamentId, { bracket, status });
}

export const recordTournamentMatchResult = mutation({
  args: {
    leagueId: v.id("leagues"),
    tournamentId: v.id("tournaments"),
    matchIndex: v.number(),
    winnerId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return recordTournamentMatchResultHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
