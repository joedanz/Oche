// ABOUTME: Handles DNP (Did Not Play) toggling and blind score auto-population.
// ABOUTME: DNP games are excluded from stats and do not award points.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

const REGULATION_INNINGS = 9;

export async function toggleDnpHandler(
  ctx: { db: DatabaseWriter },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    isDnp: boolean;
  },
) {
  await requireRole(ctx.db as any, args.userId, args.leagueId, ["admin", "captain"]);

  const game = await ctx.db.get(args.gameId);
  if (!game) throw new Error("Game not found");

  await ctx.db.patch(args.gameId, {
    isDnp: args.isDnp,
    winner: args.isDnp ? undefined : game.winner,
  });
}

export async function applyBlindScoresHandler(
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

  const isHomeBlind = game.homePlayerId === "blind";
  const isVisitorBlind = game.visitorPlayerId === "blind";
  if (!isHomeBlind && !isVisitorBlind) {
    throw new Error("No blind player in this game");
  }

  const league = await ctx.db.get(args.leagueId);
  if (!league) throw new Error("League not found");

  const defaultRuns = league.matchConfig.blindRules.defaultRuns;

  // Delete existing innings for this game
  const existing = await ctx.db
    .query("innings")
    .filter((q: any) => q.eq(q.field("gameId"), args.gameId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  // Insert 9 regulation innings for both batters
  // Blind player gets defaultRuns, real player gets 0 (to be filled in by captain)
  for (let i = 1; i <= REGULATION_INNINGS; i++) {
    await ctx.db.insert("innings", {
      gameId: args.gameId,
      inningNumber: i,
      batter: "home" as const,
      runs: isHomeBlind ? defaultRuns : 0,
      isExtra: false,
    });
    await ctx.db.insert("innings", {
      gameId: args.gameId,
      inningNumber: i,
      batter: "visitor" as const,
      runs: isVisitorBlind ? defaultRuns : 0,
      isExtra: false,
    });
  }
}

export const toggleDnp = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
    isDnp: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await toggleDnpHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const applyBlindScores = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await applyBlindScoresHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
