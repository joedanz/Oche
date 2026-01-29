// ABOUTME: Computes handicap spot runs for a game based on player averages.
// ABOUTME: Pure functions for spot runs calculation plus Convex query to fetch handicap data per game.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface SpotRunsResult {
  spotRuns: number;
  recipientSide: "home" | "visitor" | null;
}

export interface HandicappedResult {
  homeAdjusted: number;
  visitorAdjusted: number;
  winner: "home" | "visitor" | "tie";
}

/** Compute spot runs from two players' averages and a handicap percentage. */
export function computeSpotRuns(
  homeAverage: number,
  visitorAverage: number,
  handicapPercent: number,
): SpotRunsResult {
  const diff = Math.abs(homeAverage - visitorAverage);
  const spotRuns = Math.floor(diff * handicapPercent / 100);

  if (spotRuns === 0) {
    return { spotRuns: 0, recipientSide: null };
  }

  const recipientSide: "home" | "visitor" =
    homeAverage < visitorAverage ? "home" : "visitor";

  return { spotRuns, recipientSide };
}

/** Resolve the effective handicap percent from three cascading levels. */
export function resolveHandicapPercent(
  leaguePercent: number,
  matchPercent: number | undefined,
  gamePercent: number | undefined,
): number {
  if (gamePercent !== undefined) return gamePercent;
  if (matchPercent !== undefined) return matchPercent;
  return leaguePercent;
}

/** Determine the winner after applying spot runs to raw totals. */
export function determineHandicappedWinner(
  homeRawTotal: number,
  visitorRawTotal: number,
  spotRuns: number,
  recipientSide: "home" | "visitor" | null,
): HandicappedResult {
  let homeAdjusted = homeRawTotal;
  let visitorAdjusted = visitorRawTotal;

  if (recipientSide === "home") {
    homeAdjusted += spotRuns;
  } else if (recipientSide === "visitor") {
    visitorAdjusted += spotRuns;
  }

  let winner: "home" | "visitor" | "tie";
  if (homeAdjusted > visitorAdjusted) winner = "home";
  else if (visitorAdjusted > homeAdjusted) winner = "visitor";
  else winner = "tie";

  return { homeAdjusted, visitorAdjusted, winner };
}

/** Fetch handicap data for a game: player averages, effective percent, spot runs. */
export async function getGameHandicapHandler(
  ctx: { db: DatabaseReader },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const league = await ctx.db.get(args.leagueId);
  if (!league || !league.handicapEnabled) return null;

  const game = await ctx.db.get(args.gameId);
  if (!game) return null;

  // Blinds don't get handicap
  if (game.homePlayerId === "blind" || game.visitorPlayerId === "blind") return null;

  const match = await ctx.db.get(game.matchId);
  if (!match) return null;

  const effectivePercent = resolveHandicapPercent(
    league.handicapPercent ?? 0,
    match.handicapPercent,
    game.handicapPercent,
  );

  if (effectivePercent === 0) return null;

  // Get active season to look up player stats
  const seasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const activeSeason = seasons.find((s: any) => s.isActive);
  if (!activeSeason) return null;

  // Look up player stats for averages
  const allStats = await ctx.db.query("playerStats").collect();
  const homeStats = allStats.find(
    (s: any) => s.playerId === game.homePlayerId && s.seasonId === activeSeason._id,
  );
  const visitorStats = allStats.find(
    (s: any) => s.playerId === game.visitorPlayerId && s.seasonId === activeSeason._id,
  );

  const homeAvg = homeStats && homeStats.gamesPlayed > 0
    ? homeStats.totalPlus / homeStats.gamesPlayed
    : 0;
  const visitorAvg = visitorStats && visitorStats.gamesPlayed > 0
    ? visitorStats.totalPlus / visitorStats.gamesPlayed
    : 0;

  const { spotRuns, recipientSide } = computeSpotRuns(homeAvg, visitorAvg, effectivePercent);

  return {
    spotRuns,
    recipientSide,
    homeAverage: Math.round(homeAvg * 10) / 10,
    visitorAverage: Math.round(visitorAvg * 10) / 10,
    handicapPercent: effectivePercent,
  };
}

export const getGameHandicap = query({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getGameHandicapHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
