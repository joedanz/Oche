// ABOUTME: League member queries for role management UI.
// ABOUTME: Provides enriched member lists with user details for admin views.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";

export const getMembersWithDetails = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);

    const memberships = await ctx.db
      .query("leagueMemberships")
      .withIndex("by_user_league")
      .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          leagueId: m.leagueId,
          role: m.role,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
        };
      }),
    );

    return members;
  },
});
