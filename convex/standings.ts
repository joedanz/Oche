// ABOUTME: Backend query for league standings with tiebreaker sorting.
// ABOUTME: Aggregates match points, game wins, runs, and plus/minus for all teams in a league.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface StandingsEntry {
  rank: number;
  teamId: string;
  teamName: string;
  matchPoints: number;
  gameWins: number;
  totalRunsScored: number;
  plusMinus: number;
}

export interface StandingsData {
  standings: StandingsEntry[];
  seasons: { id: string; name: string; isActive: boolean }[];
  divisions: { id: string; name: string }[];
}

export async function getStandingsHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
    divisionId?: Id<"divisions">;
  },
): Promise<StandingsData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const league = await ctx.db.get(args.leagueId);
  const pointsPerGameWin = league?.matchConfig?.pointsPerGameWin ?? 1;
  const bonusForTotal = league?.matchConfig?.bonusForTotal ?? false;

  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasons = allSeasons.map((s) => ({
    id: s._id as string,
    name: s.name,
    isActive: s.isActive,
  }));

  const allDivisions = await ctx.db
    .query("divisions")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const divisions = allDivisions.map((d) => ({
    id: d._id as string,
    name: d.name,
  }));

  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { standings: [], seasons, divisions };
  }

  // Get teams, optionally filtered by division
  let teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  if (args.divisionId) {
    teams = teams.filter((t: any) => t.divisionId === args.divisionId);
  }

  // Get all matches for this league/season
  const allMatches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasonMatches = allMatches.filter((m: any) => m.seasonId === seasonId);

  // Pre-fetch all games for season matches
  const allGames: any[] = [];
  for (const match of seasonMatches) {
    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();
    allGames.push(...games.map((g: any) => ({ ...g, matchId: match._id })));
  }

  // Pre-fetch all innings for those games
  const allInnings: any[] = [];
  for (const game of allGames) {
    const innings = await ctx.db
      .query("innings")
      .filter((q: any) => q.eq(q.field("gameId"), game._id))
      .collect();
    allInnings.push(...innings);
  }

  // Build stats per team
  const teamStats = new Map<
    string,
    { gameWins: number; matchPoints: number; totalRunsScored: number; totalRunsAllowed: number }
  >();

  for (const team of teams) {
    teamStats.set(team._id as string, {
      gameWins: 0,
      matchPoints: 0,
      totalRunsScored: 0,
      totalRunsAllowed: 0,
    });
  }

  for (const match of seasonMatches) {
    const homeId = match.homeTeamId as string;
    const visitorId = match.visitorTeamId as string;
    const homeStats = teamStats.get(homeId);
    const visitorStats = teamStats.get(visitorId);

    const matchGames = allGames.filter((g: any) => g.matchId === match._id);

    let homeGameWins = 0;
    let visitorGameWins = 0;

    for (const game of matchGames) {
      if (game.isDnp) continue;

      if (game.winner === "home") homeGameWins++;
      else if (game.winner === "visitor") visitorGameWins++;

      const gameInnings = allInnings.filter((i: any) => i.gameId === game._id);
      for (const inn of gameInnings) {
        if (inn.isExtra) continue;
        if (inn.batter === "home") {
          if (homeStats) homeStats.totalRunsScored += inn.runs;
          if (visitorStats) visitorStats.totalRunsAllowed += inn.runs;
        } else if (inn.batter === "visitor") {
          if (visitorStats) visitorStats.totalRunsScored += inn.runs;
          if (homeStats) homeStats.totalRunsAllowed += inn.runs;
        }
      }
    }

    if (homeStats) {
      homeStats.gameWins += homeGameWins;
      homeStats.matchPoints += homeGameWins * pointsPerGameWin;
    }
    if (visitorStats) {
      visitorStats.gameWins += visitorGameWins;
      visitorStats.matchPoints += visitorGameWins * pointsPerGameWin;
    }

    // Bonus point
    if (bonusForTotal && match.totals?.bonusWinner) {
      if (match.totals.bonusWinner === "home" && homeStats) {
        homeStats.matchPoints += 1;
      } else if (match.totals.bonusWinner === "visitor" && visitorStats) {
        visitorStats.matchPoints += 1;
      }
    }
  }

  // Build standings entries and sort
  const entries: StandingsEntry[] = teams.map((team: any) => {
    const stats = teamStats.get(team._id as string)!;
    return {
      rank: 0,
      teamId: team._id as string,
      teamName: team.name,
      matchPoints: stats.matchPoints,
      gameWins: stats.gameWins,
      totalRunsScored: stats.totalRunsScored,
      plusMinus: stats.totalRunsScored - stats.totalRunsAllowed,
    };
  });

  // Tiebreaker order: match points → total runs scored → plus/minus
  // (head-to-head would require additional per-pair aggregation; using runs and plus/minus instead)
  entries.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.totalRunsScored !== a.totalRunsScored) return b.totalRunsScored - a.totalRunsScored;
    return b.plusMinus - a.plusMinus;
  });

  // Assign ranks
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return { standings: entries, seasons, divisions };
}

export const getStandings = query({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getStandingsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
