// ABOUTME: Backend query for player leaderboards across multiple stat categories.
// ABOUTME: Returns top 10 players per category with season and all-time views.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  teamName: string;
  value: number;
}

export interface LeaderboardCategory {
  name: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardsData {
  categories: LeaderboardCategory[];
  seasons: { id: string; name: string; isActive: boolean }[];
}

export async function getLeaderboardsHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
  },
): Promise<LeaderboardsData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasons = allSeasons.map((s) => ({
    id: s._id as string,
    name: s.name,
    isActive: s.isActive,
  }));

  const emptyCategories: LeaderboardCategory[] = [
    { name: "Highest Average", entries: [] },
    { name: "Most Runs", entries: [] },
    { name: "Best Plus/Minus", entries: [] },
    { name: "Most High Innings", entries: [] },
    { name: "Most Wins", entries: [] },
  ];

  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { categories: emptyCategories, seasons };
  }

  // Get all playerStats for this season
  const allStats = await ctx.db
    .query("playerStats")
    .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
    .collect();

  if (allStats.length === 0) {
    return { categories: emptyCategories, seasons };
  }

  // Get all teams in this league for filtering and name resolution
  const teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  const teamMap = new Map(teams.map((t: any) => [t._id as string, t.name as string]));

  // Resolve player → user names and filter to league players
  const enriched: {
    playerName: string;
    teamName: string;
    stats: any;
  }[] = [];

  for (const stat of allStats) {
    const player = await ctx.db.get(stat.playerId as Id<"players">);
    if (!player) continue;

    const teamName = teamMap.get(player.teamId as string);
    if (teamName === undefined) continue; // player not on a team in this league

    const user = await ctx.db.get(player.userId as Id<"users">);
    const playerName = user?.name ?? user?.email ?? "Unknown";

    enriched.push({ playerName, teamName, stats: stat });
  }

  function topTen(
    sortFn: (a: any, b: any) => number,
    valueFn: (e: any) => number,
  ): LeaderboardEntry[] {
    const sorted = [...enriched].sort((a, b) => sortFn(a, b));
    return sorted.slice(0, 10).map((e, i) => ({
      rank: i + 1,
      playerName: e.playerName,
      teamName: e.teamName,
      value: valueFn(e),
    }));
  }

  const categories: LeaderboardCategory[] = [
    {
      name: "Highest Average",
      entries: topTen(
        (a, b) => {
          const avgA = a.stats.gamesPlayed > 0 ? a.stats.totalPlus / a.stats.gamesPlayed : 0;
          const avgB = b.stats.gamesPlayed > 0 ? b.stats.totalPlus / b.stats.gamesPlayed : 0;
          return avgB - avgA;
        },
        (e) =>
          e.stats.gamesPlayed > 0
            ? Math.round((e.stats.totalPlus / e.stats.gamesPlayed) * 10) / 10
            : 0,
      ),
    },
    {
      name: "Most Runs",
      entries: topTen(
        (a, b) => b.stats.totalPlus - a.stats.totalPlus,
        (e) => e.stats.totalPlus,
      ),
    },
    {
      name: "Best Plus/Minus",
      entries: topTen(
        (a, b) =>
          b.stats.totalPlus - b.stats.totalMinus - (a.stats.totalPlus - a.stats.totalMinus),
        (e) => e.stats.totalPlus - e.stats.totalMinus,
      ),
    },
    {
      name: "Most High Innings",
      entries: topTen(
        (a, b) => b.stats.highInnings - a.stats.highInnings,
        (e) => e.stats.highInnings,
      ),
    },
    {
      name: "Most Wins",
      entries: topTen(
        (a, b) => b.stats.wins - a.stats.wins,
        (e) => e.stats.wins,
      ),
    },
  ];

  return { categories, seasons };
}

export const getLeaderboards = query({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getLeaderboardsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
