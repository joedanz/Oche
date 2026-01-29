// ABOUTME: Match scheduling queries and mutations with admin-only access.
// ABOUTME: Supports creating and listing matches with double-booking prevention.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getMatchesHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  // Enrich with team names
  const result = [];
  for (const match of matches) {
    const homeTeam = await ctx.db.get(match.homeTeamId);
    const visitorTeam = await ctx.db.get(match.visitorTeamId);
    result.push({
      ...match,
      homeTeamName: homeTeam?.name ?? "Unknown",
      visitorTeamName: visitorTeam?.name ?? "Unknown",
    });
  }
  return result;
}

export async function createMatchHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId: Id<"seasons">;
    homeTeamId: Id<"teams">;
    visitorTeamId: Id<"teams">;
    date: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.homeTeamId === args.visitorTeamId) {
    throw new Error("A team cannot play against itself");
  }

  // Check for double-booking on the same date
  const existingMatches = await ctx.db
    .query("matches")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  const conflicting = existingMatches.filter(
    (m) =>
      m.date === args.date &&
      (m.homeTeamId === args.homeTeamId ||
        m.visitorTeamId === args.homeTeamId ||
        m.homeTeamId === args.visitorTeamId ||
        m.visitorTeamId === args.visitorTeamId),
  );

  if (conflicting.length > 0) {
    throw new Error("A team is already scheduled on this date");
  }

  return await ctx.db.insert("matches", {
    leagueId: args.leagueId,
    seasonId: args.seasonId,
    homeTeamId: args.homeTeamId,
    visitorTeamId: args.visitorTeamId,
    date: args.date,
    status: "scheduled",
    pairings: [],
  });
}

export const getMatches = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getMatchesHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const createMatch = mutation({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.id("seasons"),
    homeTeamId: v.id("teams"),
    visitorTeamId: v.id("teams"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createMatchHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
