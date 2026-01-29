// ABOUTME: Backend queries for the team statistics page.
// ABOUTME: Aggregates game wins, runs scored/allowed, match points, and roster stats for a team.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface RosterEntry {
  playerId: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalPlus: number;
  totalMinus: number;
  highInnings: number;
  average: number;
}

export interface TeamStatsData {
  teamName: string;
  gameWins: number;
  totalRunsScored: number;
  totalRunsAllowed: number;
  matchPoints: number;
  teamPlusMinus: number;
  seasons: { id: string; name: string; isActive: boolean }[];
  roster: RosterEntry[];
}

export async function getTeamStatsHandler(
  ctx: { db: DatabaseReader },
  args: {
    teamId: Id<"teams">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId?: Id<"seasons">;
  },
): Promise<TeamStatsData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const team = await ctx.db.get(args.teamId);
  if (!team) throw new Error("Team not found");
  const teamName = team.name;

  // Get league config for points
  const league = await ctx.db.get(args.leagueId);
  const pointsPerGameWin = league?.matchConfig?.pointsPerGameWin ?? 1;
  const bonusForTotal = league?.matchConfig?.bonusForTotal ?? false;

  // Get seasons
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
    return { teamName, gameWins: 0, totalRunsScored: 0, totalRunsAllowed: 0, matchPoints: 0, teamPlusMinus: 0, seasons, roster: [] };
  }

  // Get matches where this team participated
  const allMatches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasonMatches = allMatches.filter(
    (m: any) => m.seasonId === seasonId &&
      (m.homeTeamId === args.teamId || m.visitorTeamId === args.teamId),
  );

  let gameWins = 0;
  let totalRunsScored = 0;
  let totalRunsAllowed = 0;
  let matchPoints = 0;

  for (const match of seasonMatches) {
    const isHome = match.homeTeamId === args.teamId;
    const teamSide: "home" | "visitor" = isHome ? "home" : "visitor";
    const opponentSide: "home" | "visitor" = isHome ? "visitor" : "home";

    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();

    let matchGameWins = 0;

    for (const game of games) {
      if (game.isDnp) continue;

      if (game.winner === teamSide) {
        matchGameWins++;
      }

      // Get innings for runs totals
      const innings = await ctx.db
        .query("innings")
        .filter((q: any) => q.eq(q.field("gameId"), game._id))
        .collect();

      for (const inn of innings) {
        if (inn.isExtra) continue;
        if (inn.batter === teamSide) {
          totalRunsScored += inn.runs;
        } else if (inn.batter === opponentSide) {
          totalRunsAllowed += inn.runs;
        }
      }
    }

    gameWins += matchGameWins;
    matchPoints += matchGameWins * pointsPerGameWin;

    // Bonus point
    if (bonusForTotal && match.totals?.bonusWinner) {
      const bonusSide = match.totals.bonusWinner;
      if (bonusSide === teamSide) {
        matchPoints += 1;
      }
    }
  }

  const teamPlusMinus = totalRunsScored - totalRunsAllowed;

  // Get roster with per-player stats
  const players = await ctx.db
    .query("players")
    .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
    .collect();

  const roster: RosterEntry[] = [];

  for (const player of players) {
    const user = await ctx.db.get(player.userId);
    const name = user?.name ?? user?.email ?? "Unknown";

    const stats = await ctx.db
      .query("playerStats")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("playerId"), player._id),
          q.eq(q.field("seasonId"), seasonId),
        ),
      )
      .unique();

    roster.push({
      playerId: player._id as string,
      name,
      gamesPlayed: stats?.gamesPlayed ?? 0,
      wins: stats?.wins ?? 0,
      losses: stats?.losses ?? 0,
      totalPlus: stats?.totalPlus ?? 0,
      totalMinus: stats?.totalMinus ?? 0,
      highInnings: stats?.highInnings ?? 0,
      average: stats && stats.gamesPlayed > 0 ? stats.totalPlus / stats.gamesPlayed : 0,
    });
  }

  return { teamName, gameWins, totalRunsScored, totalRunsAllowed, matchPoints, teamPlusMinus, seasons, roster };
}

export const getTeamStats = query({
  args: {
    teamId: v.id("teams"),
    leagueId: v.id("leagues"),
    seasonId: v.optional(v.id("seasons")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getTeamStatsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
