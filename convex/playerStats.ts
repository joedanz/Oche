// ABOUTME: Calculates player statistics from games and innings data.
// ABOUTME: Pure calculation function plus Convex mutation to persist stats per season.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

interface Inning {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

export interface GameData {
  gameId: string;
  homePlayerId: string;
  visitorPlayerId: string;
  winner?: "home" | "visitor" | "tie";
  isDnp?: boolean;
  innings: Inning[];
}

export interface PlayerStatsResult {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalPlus: number;
  totalMinus: number;
  highInnings: number;
}

/** Pure function: calculate player stats from a set of games. */
export function calculatePlayerStats(
  playerId: string,
  games: GameData[],
): PlayerStatsResult {
  let gamesPlayed = 0;
  let wins = 0;
  let losses = 0;
  let totalPlus = 0;
  let totalMinus = 0;
  let highInnings = 0;

  for (const game of games) {
    if (game.isDnp) continue;

    const side: "home" | "visitor" | null =
      game.homePlayerId === playerId ? "home" :
      game.visitorPlayerId === playerId ? "visitor" :
      null;

    if (!side) continue;

    gamesPlayed++;

    const opponentSide = side === "home" ? "visitor" : "home";

    // Only count regular (non-extra) innings
    for (const inn of game.innings) {
      if (inn.isExtra) continue;

      if (inn.batter === side) {
        totalPlus += inn.runs;
        if (inn.runs === 9) highInnings++;
      } else if (inn.batter === opponentSide) {
        totalMinus += inn.runs;
      }
    }

    if (game.winner === side) wins++;
    else if (game.winner === opponentSide) losses++;
  }

  return { gamesPlayed, wins, losses, totalPlus, totalMinus, highInnings };
}

/** Recalculate stats for a player in a given season. */
export async function recalculatePlayerStatsHandler(
  ctx: { db: DatabaseWriter },
  args: {
    playerId: Id<"players">;
    seasonId: Id<"seasons">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  // Get all matches for this league/season
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasonMatches = matches.filter((m: any) => m.seasonId === args.seasonId);

  // Get all games for those matches where this player participated
  const gameDataList: GameData[] = [];

  for (const match of seasonMatches) {
    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();

    for (const game of games) {
      if (game.homePlayerId !== args.playerId && game.visitorPlayerId !== args.playerId) {
        continue;
      }

      const innings = await ctx.db
        .query("innings")
        .filter((q: any) => q.eq(q.field("gameId"), game._id))
        .collect();

      gameDataList.push({
        gameId: game._id,
        homePlayerId: game.homePlayerId as string,
        visitorPlayerId: game.visitorPlayerId as string,
        winner: game.winner,
        isDnp: game.isDnp,
        innings: innings.map((i: any) => ({
          inningNumber: i.inningNumber,
          batter: i.batter,
          runs: i.runs,
          isExtra: i.isExtra,
        })),
      });
    }
  }

  const stats = calculatePlayerStats(args.playerId, gameDataList);

  // Upsert: find existing playerStats record or create one
  const existing = await ctx.db
    .query("playerStats")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("playerId"), args.playerId),
        q.eq(q.field("seasonId"), args.seasonId),
      ),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, stats);
  } else {
    await ctx.db.insert("playerStats", {
      playerId: args.playerId,
      seasonId: args.seasonId,
      ...stats,
    });
  }

  return stats;
}

/** Get stats for a single player in a season. */
export async function getPlayerStatsHandler(
  ctx: { db: DatabaseReader },
  args: {
    playerId: Id<"players">;
    seasonId: Id<"seasons">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const stats = await ctx.db
    .query("playerStats")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("playerId"), args.playerId),
        q.eq(q.field("seasonId"), args.seasonId),
      ),
    )
    .unique();

  return stats;
}

export const recalculateStats = mutation({
  args: {
    playerId: v.id("players"),
    seasonId: v.id("seasons"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await recalculatePlayerStatsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getStats = query({
  args: {
    playerId: v.id("players"),
    seasonId: v.id("seasons"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getPlayerStatsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
