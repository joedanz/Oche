// ABOUTME: Onboarding queries and mutations for new user setup.
// ABOUTME: Handles league creation with automatic admin membership and user league lookups.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter, DatabaseReader } from "./_generated/server";

const defaultMatchConfig = {
  gamesPerMatch: 5,
  pointsPerGameWin: 1,
  bonusForTotal: true,
  extraExclude: true,
  blindRules: { enabled: false, defaultRuns: 0 },
};

export async function createLeagueHandler(
  ctx: { db: DatabaseWriter },
  args: { name: string; userId: Id<"users"> },
) {
  if (!args.name.trim()) {
    throw new Error("League name is required");
  }

  const leagueId = await ctx.db.insert("leagues", {
    name: args.name.trim(),
    matchConfig: defaultMatchConfig,
    handicapEnabled: false,
  });

  await ctx.db.insert("leagueMemberships", {
    userId: args.userId,
    leagueId,
    role: "admin",
  });

  return leagueId;
}

export async function getUserLeaguesHandler(
  ctx: { db: DatabaseReader },
  args: { userId: Id<"users"> },
) {
  return await ctx.db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) => q.eq("userId", args.userId))
    .collect();
}

export const createLeague = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createLeagueHandler(ctx, {
      name: args.name,
      userId: userId as Id<"users">,
    });
  },
});

export const getUserLeagues = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getUserLeaguesHandler(ctx, {
      userId: userId as Id<"users">,
    });
  },
});
