// ABOUTME: Handicap configuration mutations for league settings.
// ABOUTME: Admin-only mutation to enable/disable handicapping, set percentage, and recalculation frequency.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import { requireFeature } from "./planGating";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

export async function updateHandicapConfigHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    handicapEnabled: boolean;
    handicapPercent: number;
    handicapRecalcFrequency: "weekly" | "per-match" | "manual";
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.handicapPercent < 0 || args.handicapPercent > 100) {
    throw new Error("Handicap percentage must be between 0 and 100");
  }

  await ctx.db.patch(args.leagueId, {
    handicapEnabled: args.handicapEnabled,
    handicapPercent: args.handicapPercent,
    handicapRecalcFrequency: args.handicapRecalcFrequency,
  });
}

export const updateHandicapConfig = mutation({
  args: {
    leagueId: v.id("leagues"),
    handicapEnabled: v.boolean(),
    handicapPercent: v.number(),
    handicapRecalcFrequency: v.union(
      v.literal("weekly"),
      v.literal("per-match"),
      v.literal("manual"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireFeature(ctx.db, userId as Id<"users">, "full_handicapping");
    await updateHandicapConfigHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
