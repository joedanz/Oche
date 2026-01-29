// ABOUTME: Determines the winner of an individual game from innings data.
// ABOUTME: Pure logic function plus Convex mutation to persist the result.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

interface Inning {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

/** Pure function: determine winner from innings data. Returns null if insufficient data. */
export function determineGameWinner(
  innings: Inning[],
): "home" | "visitor" | "tie" | null {
  if (innings.length === 0) return null;

  let homeTotal = 0;
  let visitorTotal = 0;

  for (const inn of innings) {
    if (inn.batter === "home") {
      homeTotal += inn.runs;
    } else {
      visitorTotal += inn.runs;
    }
  }

  if (homeTotal > visitorTotal) return "home";
  if (visitorTotal > homeTotal) return "visitor";
  return "tie";
}

export async function determineWinnerHandler(
  ctx: { db: DatabaseWriter },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireRole(ctx.db as any, args.userId, args.leagueId, ["admin", "captain"]);

  const game = await ctx.db.get(args.gameId);
  if (!game) throw new Error("Game not found");

  const innings = await ctx.db
    .query("innings")
    .filter((q: any) => q.eq(q.field("gameId"), args.gameId))
    .collect();

  const winner = determineGameWinner(
    innings.map((i) => ({
      inningNumber: i.inningNumber,
      batter: i.batter as "home" | "visitor",
      runs: i.runs,
      isExtra: i.isExtra,
    })),
  );

  if (winner) {
    await ctx.db.patch(args.gameId, { winner });
  }

  return winner;
}

export const determineWinner = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await determineWinnerHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
