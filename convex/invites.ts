// ABOUTME: League invitation mutations and queries for invite link management.
// ABOUTME: Handles generating, listing, revoking, and accepting invite codes.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter, DatabaseReader } from "./_generated/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createInviteHandler(
  ctx: { db: DatabaseWriter },
  args: { leagueId: Id<"leagues">; role: "captain" | "player"; userId: Id<"users"> },
) {
  const code = generateCode();
  return await ctx.db.insert("invites", {
    leagueId: args.leagueId,
    code,
    role: args.role,
    createdBy: args.userId,
    expiresAt: Date.now() + INVITE_TTL_MS,
    used: false,
  });
}

export async function getLeagueInvitesHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues"> },
) {
  return await ctx.db
    .query("invites")
    .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
    .collect();
}

export async function revokeInviteHandler(
  ctx: { db: DatabaseWriter & DatabaseReader },
  args: { inviteId: Id<"invites">; leagueId: Id<"leagues"> },
) {
  const invite = await ctx.db.get(args.inviteId);
  if (!invite || invite.leagueId !== args.leagueId) {
    throw new Error("Invite not found in this league");
  }
  await ctx.db.patch(args.inviteId, { used: true });
}

export async function acceptInviteHandler(
  ctx: { db: DatabaseWriter & DatabaseReader },
  args: { code: string; userId: Id<"users"> },
) {
  const invite = await ctx.db
    .query("invites")
    .withIndex("by_code", (q) => q.eq("code", args.code))
    .filter((q) => q.eq(q.field("used"), false))
    .first();

  if (!invite || invite.expiresAt < Date.now()) {
    throw new Error("Invalid or expired invite code");
  }

  await ctx.db.insert("leagueMemberships", {
    userId: args.userId,
    leagueId: invite.leagueId,
    role: invite.role,
  });

  await ctx.db.patch(invite._id, { used: true });
}

export const createInvite = mutation({
  args: {
    leagueId: v.id("leagues"),
    role: v.union(v.literal("captain"), v.literal("player")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);
    return await createInviteHandler(ctx, {
      leagueId: args.leagueId,
      role: args.role,
      userId: userId as Id<"users">,
    });
  },
});

export const getLeagueInvites = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);
    return await getLeagueInvitesHandler(ctx, { leagueId: args.leagueId });
  },
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id("invites"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireRole(ctx.db, userId as any, args.leagueId, ["admin"]);
    await revokeInviteHandler(ctx, {
      inviteId: args.inviteId,
      leagueId: args.leagueId,
    });
  },
});

export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await acceptInviteHandler(ctx, {
      code: args.code,
      userId: userId as Id<"users">,
    });
  },
});
