// ABOUTME: Payment configuration mutations for league settings.
// ABOUTME: Admin-only mutation to set league fee, weekly fee, and fee schedule.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

export async function updatePaymentConfigHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    leagueFee: number;
    weeklyFee: number;
    feeSchedule: "one-time" | "weekly" | "per-match";
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.leagueFee < 0 || args.weeklyFee < 0) {
    throw new Error("Fee amounts must be non-negative");
  }

  await ctx.db.patch(args.leagueId, {
    leagueFee: args.leagueFee,
    weeklyFee: args.weeklyFee,
    feeSchedule: args.feeSchedule,
  });
}

export const updatePaymentConfig = mutation({
  args: {
    leagueId: v.id("leagues"),
    leagueFee: v.number(),
    weeklyFee: v.number(),
    feeSchedule: v.union(
      v.literal("one-time"),
      v.literal("weekly"),
      v.literal("per-match"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await updatePaymentConfigHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
