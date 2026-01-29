// ABOUTME: Division management queries and mutations with admin-only access.
// ABOUTME: Supports creating, editing, deleting, listing divisions, and assigning teams to divisions.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getDivisionsHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db
    .query("divisions")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
}

export async function createDivisionHandler(
  ctx: { db: DatabaseWriter },
  args: { leagueId: Id<"leagues">; userId: Id<"users">; name: string },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  return await ctx.db.insert("divisions", {
    leagueId: args.leagueId,
    name: args.name,
  });
}

export async function editDivisionHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    divisionId: Id<"divisions">;
    name: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  const division = await ctx.db.get(args.divisionId);
  if (!division || division.leagueId !== args.leagueId) {
    throw new Error("Division not found in this league");
  }
  await ctx.db.patch(args.divisionId, { name: args.name });
}

export async function deleteDivisionHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    divisionId: Id<"divisions">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  const division = await ctx.db.get(args.divisionId);
  if (!division || division.leagueId !== args.leagueId) {
    throw new Error("Division not found in this league");
  }

  // Unassign any teams in this division
  const teams = await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("divisionId"), args.divisionId))
    .collect();
  for (const team of teams) {
    await ctx.db.patch(team._id, { divisionId: undefined });
  }

  await ctx.db.delete(args.divisionId);
}

export async function assignTeamDivisionHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    teamId: Id<"teams">;
    divisionId?: Id<"divisions">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const team = await ctx.db.get(args.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Team not found in this league");
  }

  if (args.divisionId) {
    const division = await ctx.db.get(args.divisionId);
    if (!division || division.leagueId !== args.leagueId) {
      throw new Error("Division not found in this league");
    }
  }

  await ctx.db.patch(args.teamId, { divisionId: args.divisionId });
}

export async function getTeamsForLeagueHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();
}

export const getTeamsForLeague = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getTeamsForLeagueHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const getDivisions = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getDivisionsHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const createDivision = mutation({
  args: { leagueId: v.id("leagues"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createDivisionHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const editDivision = mutation({
  args: {
    leagueId: v.id("leagues"),
    divisionId: v.id("divisions"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await editDivisionHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const deleteDivision = mutation({
  args: { leagueId: v.id("leagues"), divisionId: v.id("divisions") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await deleteDivisionHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const assignTeamDivision = mutation({
  args: {
    leagueId: v.id("leagues"),
    teamId: v.id("teams"),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await assignTeamDivisionHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
