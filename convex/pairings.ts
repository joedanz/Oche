// ABOUTME: Player pairing mutations and queries for match game slots.
// ABOUTME: Handles assigning players or blinds to game slots within a match.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

const pairingValidator = v.object({
  slot: v.number(),
  homePlayerId: v.union(v.id("players"), v.literal("blind")),
  visitorPlayerId: v.union(v.id("players"), v.literal("blind")),
});

export async function savePairingsHandler(
  ctx: { db: DatabaseWriter },
  args: {
    matchId: Id<"matches">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    pairings: Array<{
      slot: number;
      homePlayerId: Id<"players"> | "blind";
      visitorPlayerId: Id<"players"> | "blind";
    }>;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin", "captain"]);

  const match = await ctx.db.get(args.matchId);
  if (!match || match.leagueId !== args.leagueId) {
    throw new Error("Match not found in this league");
  }

  // Check for duplicate players (blinds excluded)
  const playerIds: string[] = [];
  for (const pairing of args.pairings) {
    for (const id of [pairing.homePlayerId, pairing.visitorPlayerId]) {
      if (id !== "blind") {
        if (playerIds.includes(id)) {
          throw new Error(`Player already paired in this match`);
        }
        playerIds.push(id);
      }
    }
  }

  await ctx.db.patch(args.matchId, { pairings: args.pairings });
}

export async function getMatchWithRostersHandler(
  ctx: { db: DatabaseReader },
  args: {
    matchId: Id<"matches">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, [
    "admin",
    "captain",
    "player",
  ]);

  const match = await ctx.db.get(args.matchId);
  if (!match || match.leagueId !== args.leagueId) {
    throw new Error("Match not found in this league");
  }

  const homeTeam = await ctx.db.get(match.homeTeamId);
  const visitorTeam = await ctx.db.get(match.visitorTeamId);

  // Get active players for both teams
  async function getActivePlayers(teamId: Id<"teams">) {
    const players = await ctx.db
      .query("players")
      .filter((q: any) => q.eq(q.field("teamId"), teamId))
      .collect();

    const activePlayers = players.filter((p) => p.status === "active");
    const result = [];
    for (const player of activePlayers) {
      const user = await ctx.db.get(player.userId);
      result.push({
        _id: player._id,
        name: user?.name ?? user?.email ?? "Unknown",
      });
    }
    return result;
  }

  const homePlayers = await getActivePlayers(match.homeTeamId);
  const visitorPlayers = await getActivePlayers(match.visitorTeamId);

  return {
    match,
    homeTeamName: homeTeam?.name ?? "Unknown",
    visitorTeamName: visitorTeam?.name ?? "Unknown",
    homePlayers,
    visitorPlayers,
  };
}

export const savePairings = mutation({
  args: {
    matchId: v.id("matches"),
    leagueId: v.id("leagues"),
    pairings: v.array(pairingValidator),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await savePairingsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getMatchWithRosters = query({
  args: {
    matchId: v.id("matches"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getMatchWithRostersHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
