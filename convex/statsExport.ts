// ABOUTME: Backend query returning all player stats for a league/season, used by CSV/PDF export.
// ABOUTME: Returns enriched player stats with names, team names, and computed averages.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface ExportPlayerStat {
  playerName: string;
  teamName: string;
  average: number;
  totalPlus: number;
  totalMinus: number;
  plusMinus: number;
  highInnings: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface ExportData {
  playerStats: ExportPlayerStat[];
  seasons: { id: string; name: string; isActive: boolean }[];
}

export async function getExportDataHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
  },
): Promise<ExportData> {
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

  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { playerStats: [], seasons };
  }

  const allStats = await ctx.db
    .query("playerStats")
    .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
    .collect();

  const teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  const teamMap = new Map(teams.map((t: any) => [t._id as string, t.name as string]));

  const playerStats: ExportPlayerStat[] = [];

  for (const stat of allStats) {
    const player = await ctx.db.get(stat.playerId as Id<"players">);
    if (!player) continue;

    const teamName = teamMap.get(player.teamId as string);
    if (teamName === undefined) continue;

    const user = await ctx.db.get(player.userId as Id<"users">);
    const playerName = user?.name ?? user?.email ?? "Unknown";

    const gp = stat.gamesPlayed ?? 0;
    const average = gp > 0 ? Math.round((stat.totalPlus / gp) * 10) / 10 : 0;

    playerStats.push({
      playerName,
      teamName,
      average,
      totalPlus: stat.totalPlus,
      totalMinus: stat.totalMinus,
      plusMinus: stat.totalPlus - stat.totalMinus,
      highInnings: stat.highInnings,
      wins: stat.wins,
      losses: stat.losses,
      gamesPlayed: gp,
    });
  }

  playerStats.sort((a, b) => b.average - a.average);

  return { playerStats, seasons };
}

export const getExportData = query({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getExportDataHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
