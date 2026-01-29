// ABOUTME: Query for fetching enriched match details with team names, player names, and game results.
// ABOUTME: Used by the match detail page to display all match information in one view.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export async function getMatchDetailHandler(
  ctx: { db: DatabaseReader },
  args: {
    matchId: Id<"matches">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);

  const match = await ctx.db.get(args.matchId);
  if (!match || match.leagueId !== args.leagueId) {
    throw new Error("Match not found in this league");
  }

  const homeTeam = await ctx.db.get(match.homeTeamId);
  const visitorTeam = await ctx.db.get(match.visitorTeamId);

  // Resolve player names in pairings
  async function resolvePlayerName(playerId: Id<"players"> | "blind") {
    if (playerId === "blind") return "Blind";
    const player = await ctx.db.get(playerId);
    if (!player) return "Unknown";
    const user = await ctx.db.get(player.userId);
    return user?.name ?? user?.email ?? "Unknown";
  }

  const pairings = [];
  for (const pairing of match.pairings) {
    pairings.push({
      slot: pairing.slot,
      homePlayerId: pairing.homePlayerId,
      visitorPlayerId: pairing.visitorPlayerId,
      homePlayerName: await resolvePlayerName(pairing.homePlayerId),
      visitorPlayerName: await resolvePlayerName(pairing.visitorPlayerId),
    });
  }

  // Fetch games for this match
  const allGames = await ctx.db
    .query("games")
    .filter((q: any) => q.eq(q.field("matchId"), args.matchId))
    .collect();

  const games = allGames
    .sort((a, b) => a.slot - b.slot)
    .map((g) => ({
      _id: g._id,
      slot: g.slot,
      homePlayerId: g.homePlayerId,
      visitorPlayerId: g.visitorPlayerId,
      winner: g.winner,
    }));

  return {
    match,
    homeTeamName: homeTeam?.name ?? "Unknown",
    visitorTeamName: visitorTeam?.name ?? "Unknown",
    pairings,
    games,
  };
}

export const getMatchDetail = query({
  args: {
    matchId: v.id("matches"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getMatchDetailHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
