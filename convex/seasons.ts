// ABOUTME: Season management queries and mutations with admin-only access.
// ABOUTME: Supports creating, listing, and activating seasons within a league.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getSeasonsHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
}

export async function createSeasonHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    name: string;
    startDate: string;
    endDate: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  return await ctx.db.insert("seasons", {
    leagueId: args.leagueId,
    name: args.name,
    startDate: args.startDate,
    endDate: args.endDate,
    isActive: false,
  });
}

export async function activateSeasonHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId: Id<"seasons">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const season = await ctx.db.get(args.seasonId);
  if (!season || season.leagueId !== args.leagueId) {
    throw new Error("Season not found in this league");
  }

  // Deactivate all other seasons in this league
  const allSeasons = await ctx.db
    .query("seasons")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();

  for (const s of allSeasons) {
    if (s.isActive) {
      await ctx.db.patch(s._id, { isActive: false });
    }
  }

  await ctx.db.patch(args.seasonId, { isActive: true });
}

export const getSeasons = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getSeasonsHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const createSeason = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createSeasonHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const activateSeason = mutation({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.id("seasons"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await activateSeasonHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
