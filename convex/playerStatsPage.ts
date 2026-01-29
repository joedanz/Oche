// ABOUTME: Backend queries for the player stats page.
// ABOUTME: Returns player summary stats, game-by-game history, and player info.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export interface GameHistoryEntry {
  gameId: string;
  matchDate: string;
  opponentName: string;
  side: "home" | "visitor";
  plus: number;
  minus: number;
  total: number;
  highInnings: number;
  result: "win" | "loss" | "tie" | "pending";
}

export interface PlayerPageData {
  playerName: string;
  teamName: string;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalPlus: number;
    totalMinus: number;
    highInnings: number;
    average: number;
  } | null;
  gameHistory: GameHistoryEntry[];
  seasons: { id: string; name: string; isActive: boolean }[];
}

export async function getPlayerPageDataHandler(
  ctx: { db: DatabaseReader },
  args: {
    playerId: Id<"players">;
    seasonId?: Id<"seasons">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
): Promise<PlayerPageData> {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  // Get player + user info
  const player = await ctx.db.get(args.playerId);
  if (!player) throw new Error("Player not found");
  const user = await ctx.db.get(player.userId);
  const playerName = user?.name ?? user?.email ?? "Unknown";

  // Get team info
  const team = await ctx.db.get(player.teamId);
  const teamName = team?.name ?? "Unknown Team";

  // Get seasons for the selector
  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const seasons = allSeasons.map((s) => ({
    id: s._id as string,
    name: s.name,
    isActive: s.isActive,
  }));

  // Determine which season to use
  const seasonId =
    args.seasonId ?? (allSeasons.find((s) => s.isActive)?._id as Id<"seasons"> | undefined);

  if (!seasonId) {
    return { playerName, teamName, stats: null, gameHistory: [], seasons };
  }

  // Get stored stats
  const storedStats = await ctx.db
    .query("playerStats")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("playerId"), args.playerId),
        q.eq(q.field("seasonId"), seasonId),
      ),
    )
    .unique();

  const stats = storedStats
    ? {
        gamesPlayed: storedStats.gamesPlayed,
        wins: storedStats.wins,
        losses: storedStats.losses,
        totalPlus: storedStats.totalPlus,
        totalMinus: storedStats.totalMinus,
        highInnings: storedStats.highInnings,
        average:
          storedStats.gamesPlayed > 0
            ? storedStats.totalPlus / storedStats.gamesPlayed
            : 0,
      }
    : null;

  // Get game-by-game history
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
  const seasonMatches = matches.filter(
    (m: any) => m.seasonId === seasonId,
  );

  const gameHistory: GameHistoryEntry[] = [];

  for (const match of seasonMatches) {
    const games = await ctx.db
      .query("games")
      .filter((q: any) => q.eq(q.field("matchId"), match._id))
      .collect();

    for (const game of games) {
      if (game.isDnp) continue;

      const side: "home" | "visitor" | null =
        game.homePlayerId === args.playerId
          ? "home"
          : game.visitorPlayerId === args.playerId
            ? "visitor"
            : null;

      if (!side) continue;

      const opponentSide = side === "home" ? "visitor" : "home";
      const opponentPlayerId =
        side === "home" ? game.visitorPlayerId : game.homePlayerId;

      // Resolve opponent name
      let opponentName = "Blind";
      if (opponentPlayerId !== "blind") {
        const oppPlayer = await ctx.db.get(opponentPlayerId as Id<"players">);
        if (oppPlayer) {
          const oppUser = await ctx.db.get(oppPlayer.userId);
          opponentName = oppUser?.name ?? oppUser?.email ?? "Unknown";
        }
      }

      // Get innings for this game
      const innings = await ctx.db
        .query("innings")
        .filter((q: any) => q.eq(q.field("gameId"), game._id))
        .collect();

      let plus = 0;
      let minus = 0;
      let hi = 0;

      for (const inn of innings) {
        if (inn.isExtra) continue;
        if (inn.batter === side) {
          plus += inn.runs;
          if (inn.runs === 9) hi++;
        } else if (inn.batter === opponentSide) {
          minus += inn.runs;
        }
      }

      let result: "win" | "loss" | "tie" | "pending" = "pending";
      if (game.winner === side) result = "win";
      else if (game.winner === opponentSide) result = "loss";
      else if (game.winner === "tie") result = "tie";

      gameHistory.push({
        gameId: game._id as string,
        matchDate: match.date,
        opponentName,
        side,
        plus,
        minus,
        total: plus - minus,
        highInnings: hi,
        result,
      });
    }
  }

  // Sort by date descending (most recent first)
  gameHistory.sort((a, b) => b.matchDate.localeCompare(a.matchDate));

  return { playerName, teamName, stats, gameHistory, seasons };
}

export const getPlayerPageData = query({
  args: {
    playerId: v.id("players"),
    seasonId: v.optional(v.id("seasons")),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getPlayerPageDataHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
