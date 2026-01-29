// ABOUTME: Team management queries and mutations with admin-only access.
// ABOUTME: Supports creating, editing, and listing teams within a league.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getTeamsHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db
    .query("teams")
    .filter((q: any) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();
}

export async function createTeamHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    name: string;
    venue?: string;
    divisionId?: Id<"divisions">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  return await ctx.db.insert("teams", {
    leagueId: args.leagueId,
    name: args.name,
    venue: args.venue,
    divisionId: args.divisionId,
  });
}

export async function editTeamHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    teamId: Id<"teams">;
    name?: string;
    venue?: string;
    divisionId?: Id<"divisions">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);
  const team = await ctx.db.get(args.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Team not found in this league");
  }
  const patch: Record<string, any> = {};
  if (args.name !== undefined) patch.name = args.name;
  if (args.venue !== undefined) patch.venue = args.venue;
  if (args.divisionId !== undefined) patch.divisionId = args.divisionId;
  await ctx.db.patch(args.teamId, patch);
}

export const getTeams = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getTeamsHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const createTeam = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.string(),
    venue: v.optional(v.string()),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await createTeamHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const editTeam = mutation({
  args: {
    leagueId: v.id("leagues"),
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    venue: v.optional(v.string()),
    divisionId: v.optional(v.id("divisions")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await editTeamHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
