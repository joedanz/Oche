// ABOUTME: Match configuration mutations for league settings.
// ABOUTME: Admin-only mutation to update games per match, points, bonus, extras, and blind rules.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

export async function updateMatchConfigHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    gamesPerMatch: number;
    pointsPerGameWin: number;
    bonusForTotal: boolean;
    extraExclude: boolean;
    blindEnabled: boolean;
    blindDefaultRuns: number;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.gamesPerMatch < 1) {
    throw new Error("Games per match must be at least 1");
  }

  await ctx.db.patch(args.leagueId, {
    matchConfig: {
      gamesPerMatch: args.gamesPerMatch,
      pointsPerGameWin: args.pointsPerGameWin,
      bonusForTotal: args.bonusForTotal,
      extraExclude: args.extraExclude,
      blindRules: {
        enabled: args.blindEnabled,
        defaultRuns: args.blindDefaultRuns,
      },
    },
  });
}

export const updateMatchConfig = mutation({
  args: {
    leagueId: v.id("leagues"),
    gamesPerMatch: v.number(),
    pointsPerGameWin: v.number(),
    bonusForTotal: v.boolean(),
    extraExclude: v.boolean(),
    blindEnabled: v.boolean(),
    blindDefaultRuns: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await updateMatchConfigHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
