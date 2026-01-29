// ABOUTME: League management queries and mutations with role-based access control.
// ABOUTME: All league-scoped operations enforce permissions via leagueMemberships.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember, countAdmins } from "./authorization";
import { auth } from "./auth";

export const getLeague = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leagueId);
  },
});

export const getMembers = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    await requireLeagueMember(ctx.db, userId as any, args.leagueId);
    return await ctx.db
      .query("leagueMemberships")
      .withIndex("by_user_league")
      .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
      .collect();
  },
});

export const updateLeague = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;
    await ctx.db.patch(args.leagueId, updates);
  },
});

export const updateMemberRole = mutation({
  args: {
    leagueId: v.id("leagues"),
    targetUserId: v.id("users"),
    newRole: v.union(
      v.literal("admin"),
      v.literal("captain"),
      v.literal("player"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);

    const membership = await ctx.db
      .query("leagueMemberships")
      .withIndex("by_user_league", (q) =>
        q.eq("userId", args.targetUserId).eq("leagueId", args.leagueId),
      )
      .unique();

    if (!membership) {
      throw new Error("Target user is not a member of this league");
    }

    if (membership.role === "admin" && args.newRole !== "admin") {
      const adminCount = await countAdmins(ctx.db, args.leagueId);
      if (adminCount <= 1) {
        throw new Error("Cannot remove the last admin from this league");
      }
    }

    await ctx.db.patch(membership._id, { role: args.newRole });
  },
});
