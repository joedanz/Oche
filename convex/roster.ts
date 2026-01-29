// ABOUTME: Team roster management mutations and queries.
// ABOUTME: Handles adding, removing players, and toggling active/inactive status.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getRosterHandler(
  ctx: { db: DatabaseReader },
  args: { teamId: Id<"teams">; leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, [
    "admin",
    "captain",
    "player",
  ]);
  const team = await ctx.db.get(args.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Team not found in this league");
  }

  const players = await ctx.db
    .query("players")
    .filter((q: any) => q.eq(q.field("teamId"), args.teamId))
    .collect();

  const result = [];
  for (const player of players) {
    const user = await ctx.db.get(player.userId);
    result.push({
      ...player,
      userName: user?.name ?? user?.email ?? "Unknown",
      userEmail: user?.email ?? "",
    });
  }
  return result;
}

export async function addPlayerHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    teamId: Id<"teams">;
    playerName: string;
    playerEmail: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin", "captain"]);

  const team = await ctx.db.get(args.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Team not found in this league");
  }

  // Find or create user by email
  const existingUsers = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), args.playerEmail))
    .collect();

  let targetUserId: Id<"users">;
  if (existingUsers.length > 0) {
    targetUserId = existingUsers[0]._id;
  } else {
    targetUserId = await ctx.db.insert("users", {
      email: args.playerEmail,
      name: args.playerName,
    });
  }

  // Check if player already exists on this team
  const existingPlayer = await ctx.db
    .query("players")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("userId"), targetUserId),
        q.eq(q.field("teamId"), args.teamId),
      ),
    )
    .first();

  if (existingPlayer) {
    throw new Error("Player is already on this team");
  }

  const playerId = await ctx.db.insert("players", {
    userId: targetUserId,
    teamId: args.teamId,
    status: "active",
  });

  // Ensure user has a league membership
  const membership = await ctx.db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) =>
      q.eq("userId", targetUserId).eq("leagueId", args.leagueId),
    )
    .unique();

  if (!membership) {
    await ctx.db.insert("leagueMemberships", {
      userId: targetUserId,
      leagueId: args.leagueId,
      role: "player",
    });
  }

  return playerId;
}

export async function removePlayerHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    playerId: Id<"players">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin", "captain"]);

  const player = await ctx.db.get(args.playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  const team = await ctx.db.get(player.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Player not in this league");
  }

  // If this player is the team captain, clear captainId
  if (team.captainId === args.playerId) {
    await ctx.db.patch(player.teamId, { captainId: undefined });
  }

  await ctx.db.delete(args.playerId);
}

export async function setPlayerStatusHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    playerId: Id<"players">;
    status: "active" | "inactive";
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin", "captain"]);

  const player = await ctx.db.get(args.playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  const team = await ctx.db.get(player.teamId);
  if (!team || team.leagueId !== args.leagueId) {
    throw new Error("Player not in this league");
  }

  await ctx.db.patch(args.playerId, { status: args.status });
}

export const getRoster = query({
  args: { teamId: v.id("teams"), leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await getRosterHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const addPlayer = mutation({
  args: {
    leagueId: v.id("leagues"),
    teamId: v.id("teams"),
    playerName: v.string(),
    playerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await addPlayerHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const removePlayer = mutation({
  args: {
    leagueId: v.id("leagues"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await removePlayerHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const setPlayerStatus = mutation({
  args: {
    leagueId: v.id("leagues"),
    playerId: v.id("players"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await setPlayerStatusHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
