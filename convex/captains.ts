// ABOUTME: Captain assignment queries and mutations for teams.
// ABOUTME: Handles assigning/changing team captains with role updates.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getTeamPlayersHandler(
  ctx: { db: DatabaseReader },
  args: { teamId: Id<"teams">; leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, [
    "admin",
    "captain",
    "player",
  ]);
  const players = await ctx.db
    .query("players")
    .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
    .collect();

  // Enrich with user names
  const result = [];
  for (const player of players) {
    const user = await ctx.db.get(player.userId);
    result.push({
      ...player,
      userName: user?.name ?? user?.email ?? "Unknown",
    });
  }
  return result;
}

export async function assignCaptainHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    teamId: Id<"teams">;
    playerId: Id<"players">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const team = await ctx.db.get(args.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Team not found in this league");
  }

  const player = await ctx.db.get(args.playerId);
  if (!player || player.teamId !== args.teamId) {
    throw new Error("Player is not on this team");
  }

  // Demote previous captain if exists
  if (team.captainId && team.captainId !== args.playerId) {
    const oldCaptain = await ctx.db.get(team.captainId);
    if (oldCaptain) {
      const oldMembership = await ctx.db
        .query("leagueMemberships")
        .withIndex("by_user_league", (q) =>
          q.eq("userId", oldCaptain.userId).eq("leagueId", args.leagueId),
        )
        .unique();
      if (oldMembership && oldMembership.role === "captain") {
        await ctx.db.patch(oldMembership._id, { role: "player" });
      }
    }
  }

  // Promote new captain
  const newMembership = await ctx.db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) =>
      q.eq("userId", player.userId).eq("leagueId", args.leagueId),
    )
    .unique();
  if (newMembership) {
    await ctx.db.patch(newMembership._id, { role: "captain" });
  }

  // Update team
  await ctx.db.patch(args.teamId, { captainId: args.playerId });
}

export const getTeamPlayers = query({
  args: { teamId: v.id("teams"), leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getTeamPlayersHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const assignCaptain = mutation({
  args: {
    leagueId: v.id("leagues"),
    teamId: v.id("teams"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await assignCaptainHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
