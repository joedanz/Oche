// ABOUTME: Backend queries and mutations for public league pages.
// ABOUTME: Exposes league standings, schedule, and results without requiring authentication.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface PublicLeagueData {
  leagueName: string;
  standings: {
    rank: number;
    teamName: string;
    matchPoints: number;
    gameWins: number;
    totalRunsScored: number;
    plusMinus: number;
  }[];
  schedule: {
    matchId: string;
    homeTeam: string;
    visitorTeam: string;
    date: string;
    status: string;
  }[];
  recentResults: {
    matchId: string;
    homeTeam: string;
    visitorTeam: string;
    date: string;
    homePoints: number;
    visitorPoints: number;
  }[];
}

export async function toggleVisibilityHandler(
  ctx: { db: any },
  args: { leagueId: Id<"leagues">; userId: Id<"users">; isPublic: boolean },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  await ctx.db.patch(args.leagueId, { isPublic: args.isPublic });
}

export async function getPublicLeagueDataHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues"> },
): Promise<PublicLeagueData | null> {
  const league = await ctx.db.get(args.leagueId);
  if (!league || !league.isPublic) return null;

  const pointsPerGameWin = league.matchConfig?.pointsPerGameWin ?? 1;
  const bonusForTotal = league.matchConfig?.bonusForTotal ?? false;

  // Get active season
  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const activeSeason = allSeasons.find((s: any) => s.isActive);

  // Get teams
  const teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();
  const teamMap = new Map(teams.map((t: any) => [t._id as string, t.name as string]));

  // Get matches for active season
  const allMatches = activeSeason
    ? await ctx.db
        .query("matches")
        .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
        .collect()
    : [];
  const seasonMatches = allMatches.filter(
    (m: any) => activeSeason && m.seasonId === activeSeason._id,
  );

  // Build standings
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

  // Pre-fetch games and innings
  const allGames: any[] = [];
  for (const match of seasonMatches) {
    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();
    allGames.push(...games.map((g: any) => ({ ...g, matchId: match._id })));
  }

  const allInnings: any[] = [];
  for (const game of allGames) {
    const innings = await ctx.db
      .query("innings")
      .filter((q: any) => q.eq(q.field("gameId"), game._id))
      .collect();
    allInnings.push(...innings);
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

    if (bonusForTotal && match.totals?.bonusWinner) {
      if (match.totals.bonusWinner === "home" && homeStats) homeStats.matchPoints += 1;
      else if (match.totals.bonusWinner === "visitor" && visitorStats) visitorStats.matchPoints += 1;
    }
  }

  const standings = teams
    .map((team: any) => {
      const stats = teamStats.get(team._id as string)!;
      return {
        rank: 0,
        teamName: team.name,
        matchPoints: stats.matchPoints,
        gameWins: stats.gameWins,
        totalRunsScored: stats.totalRunsScored,
        plusMinus: stats.totalRunsScored - stats.totalRunsAllowed,
      };
    })
    .sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
      if (b.totalRunsScored !== a.totalRunsScored) return b.totalRunsScored - a.totalRunsScored;
      return b.plusMinus - a.plusMinus;
    });
  standings.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  // Schedule (upcoming)
  const now = new Date().toISOString().split("T")[0];
  const schedule = seasonMatches
    .filter((m: any) => m.status === "scheduled" && m.date >= now)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 10)
    .map((m: any) => ({
      matchId: m._id as string,
      homeTeam: teamMap.get(m.homeTeamId as string) ?? "Unknown",
      visitorTeam: teamMap.get(m.visitorTeamId as string) ?? "Unknown",
      date: m.date,
      status: m.status,
    }));

  // Recent results (completed, most recent first)
  const recentResults = seasonMatches
    .filter((m: any) => m.status === "completed")
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((m: any) => {
      const matchGames = allGames.filter((g: any) => g.matchId === m._id);
      let homePoints = 0;
      let visitorPoints = 0;
      for (const game of matchGames) {
        if (game.isDnp) continue;
        if (game.winner === "home") homePoints += pointsPerGameWin;
        else if (game.winner === "visitor") visitorPoints += pointsPerGameWin;
      }
      return {
        matchId: m._id as string,
        homeTeam: teamMap.get(m.homeTeamId as string) ?? "Unknown",
        visitorTeam: teamMap.get(m.visitorTeamId as string) ?? "Unknown",
        date: m.date,
        homePoints,
        visitorPoints,
      };
    });

  return {
    leagueName: league.name,
    standings,
    schedule,
    recentResults,
  };
}

export const toggleVisibility = mutation({
  args: {
    leagueId: v.id("leagues"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await toggleVisibilityHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getPublicLeagueData = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    return await getPublicLeagueDataHandler(ctx, args);
  },
});
