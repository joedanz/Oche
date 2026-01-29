// ABOUTME: Backend queries for historical performance trends.
// ABOUTME: Returns time-series data for player averages and team points over matches.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import { requireFeature } from "./planGating";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface PlayerTrendPoint {
  matchDate: string;
  average: number;
  cumulativeAverage: number;
}

export interface TeamTrendPoint {
  matchDate: string;
  matchPoints: number;
  cumulativePoints: number;
}

export interface TrendEntity {
  id: string;
  name: string;
}

export interface TrendsData {
  players: TrendEntity[];
  teams: TrendEntity[];
  seasons: { id: string; name: string; isActive: boolean }[];
}

export interface PlayerTrendData {
  playerName: string;
  points: PlayerTrendPoint[];
}

export interface TeamTrendData {
  teamName: string;
  points: TeamTrendPoint[];
}

export async function getTrendsMetadataHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
): Promise<TrendsData> {
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

  const teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  // Get all players from teams in this league
  const players: TrendEntity[] = [];
  for (const team of teams) {
    const teamPlayers = await ctx.db
      .query("players")
      .filter((q: any) => q.eq(q.field("teamId"), team._id))
      .collect();

    for (const player of teamPlayers) {
      const user = await ctx.db.get(player.userId);
      players.push({
        id: player._id as string,
        name: user?.name ?? user?.email ?? "Unknown",
      });
    }
  }

  return {
    players,
    teams: teams.map((t) => ({ id: t._id as string, name: t.name })),
    seasons,
  };
}

export async function getPlayerTrendHandler(
  ctx: { db: DatabaseReader },
  args: {
    playerId: Id<"players">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
  },
): Promise<PlayerTrendData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const player = await ctx.db.get(args.playerId);
  if (!player) throw new Error("Player not found");
  const user = await ctx.db.get(player.userId);
  const playerName = user?.name ?? user?.email ?? "Unknown";

  // Determine season
  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { playerName, points: [] };
  }

  // Get season matches sorted by date
  const allMatches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const seasonMatches = allMatches
    .filter((m: any) => m.seasonId === seasonId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const points: PlayerTrendPoint[] = [];
  let cumulativePlus = 0;
  let cumulativeGames = 0;

  for (const match of seasonMatches) {
    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();

    let matchPlus = 0;
    let matchGames = 0;

    for (const game of games) {
      if (game.isDnp) continue;

      const side: "home" | "visitor" | null =
        game.homePlayerId === args.playerId
          ? "home"
          : game.visitorPlayerId === args.playerId
            ? "visitor"
            : null;

      if (!side) continue;

      matchGames++;

      const innings = await ctx.db
        .query("innings")
        .filter((q: any) => q.eq(q.field("gameId"), game._id))
        .collect();

      for (const inn of innings) {
        if (inn.isExtra) continue;
        if (inn.batter === side) {
          matchPlus += inn.runs;
        }
      }
    }

    if (matchGames > 0) {
      cumulativePlus += matchPlus;
      cumulativeGames += matchGames;
      const average = matchGames > 0 ? matchPlus / matchGames : 0;
      const cumulativeAverage = cumulativeGames > 0 ? cumulativePlus / cumulativeGames : 0;

      points.push({
        matchDate: match.date,
        average: Math.round(average * 10) / 10,
        cumulativeAverage: Math.round(cumulativeAverage * 10) / 10,
      });
    }
  }

  return { playerName, points };
}

export async function getTeamTrendHandler(
  ctx: { db: DatabaseReader },
  args: {
    teamId: Id<"teams">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
  },
): Promise<TeamTrendData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const team = await ctx.db.get(args.teamId);
  if (!team) throw new Error("Team not found");

  const league = await ctx.db.get(args.leagueId);
  const pointsPerGameWin = league?.matchConfig?.pointsPerGameWin ?? 1;
  const bonusForTotal = league?.matchConfig?.bonusForTotal ?? false;

  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { teamName: team.name, points: [] };
  }

  const allMatches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const seasonMatches = allMatches
    .filter((m: any) => m.seasonId === seasonId &&
      (m.homeTeamId === args.teamId || m.visitorTeamId === args.teamId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const points: TeamTrendPoint[] = [];
  let cumulativePoints = 0;

  for (const match of seasonMatches) {
    const isHome = match.homeTeamId === args.teamId;
    const teamSide: "home" | "visitor" = isHome ? "home" : "visitor";

    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();

    let matchGameWins = 0;
    for (const game of games) {
      if (game.isDnp) continue;
      if (game.winner === teamSide) matchGameWins++;
    }

    let matchPoints = matchGameWins * pointsPerGameWin;
    if (bonusForTotal && match.totals?.bonusWinner === teamSide) {
      matchPoints += 1;
    }

    cumulativePoints += matchPoints;

    points.push({
      matchDate: match.date,
      matchPoints,
      cumulativePoints,
    });
  }

  return { teamName: team.name, points };
}

export const getTrendsMetadata = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    await requireFeature(ctx.db, userId as Id<"users">, "historical_trends");
    return await getTrendsMetadataHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getPlayerTrend = query({
  args: {
    playerId: v.id("players"),
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getPlayerTrendHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getTeamTrend = query({
  args: {
    teamId: v.id("teams"),
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getTeamTrendHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
