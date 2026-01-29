// ABOUTME: Dashboard queries for displaying user league overview.
// ABOUTME: Joins league memberships with league details for the current user.

import { query } from "./_generated/server";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

export async function getUserLeaguesWithDetailsHandler(
  ctx: { db: DatabaseReader },
  args: { userId: Id<"users"> },
) {
  const memberships = await ctx.db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) => q.eq("userId", args.userId))
    .collect();

  const results = [];
  for (const m of memberships) {
    const league = await ctx.db.get(m.leagueId);
    if (!league) continue;
    results.push({
      leagueId: m.leagueId,
      leagueName: league.name,
      role: m.role,
    });
  }
  return results;
}

export const getUserLeaguesWithDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getUserLeaguesWithDetailsHandler(ctx, {
      userId: userId as Id<"users">,
    });
  },
});
