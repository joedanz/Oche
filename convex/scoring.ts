// ABOUTME: Innings score entry mutations and queries for individual games.
// ABOUTME: Handles saving, retrieving, and replacing innings data with runs validation.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

const batterType = v.union(v.literal("home"), v.literal("visitor"));

interface InningInput {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

export async function saveInningsHandler(
  ctx: { db: DatabaseWriter },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    innings: InningInput[];
  },
) {
  await requireRole(ctx.db as any, args.userId, args.leagueId, ["admin", "captain"]);

  const game = await ctx.db.get(args.gameId);
  if (!game) throw new Error("Game not found");

  // Validate runs 0-9
  for (const inning of args.innings) {
    if (inning.runs < 0 || inning.runs > 9) {
      throw new Error("Runs must be between 0 and 9");
    }
  }

  // Delete existing innings for this game
  const existing = await ctx.db
    .query("innings")
    .filter((q: any) => q.eq(q.field("gameId"), args.gameId))
    .collect();

  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  // Insert new innings
  for (const inning of args.innings) {
    await ctx.db.insert("innings", {
      gameId: args.gameId,
      inningNumber: inning.inningNumber,
      batter: inning.batter,
      runs: inning.runs,
      isExtra: inning.isExtra,
    });
  }
}

export async function getGameInningsHandler(
  ctx: { db: DatabaseReader },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);

  const innings = await ctx.db
    .query("innings")
    .filter((q: any) => q.eq(q.field("gameId"), args.gameId))
    .collect();

  return innings
    .sort((a, b) => {
      if (a.inningNumber !== b.inningNumber) return a.inningNumber - b.inningNumber;
      return a.batter === "home" ? -1 : 1;
    })
    .map((i) => ({
      inningNumber: i.inningNumber,
      batter: i.batter,
      runs: i.runs,
      isExtra: i.isExtra,
    }));
}

export const saveInnings = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
    innings: v.array(
      v.object({
        inningNumber: v.number(),
        batter: batterType,
        runs: v.number(),
        isExtra: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await saveInningsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getGameInnings = query({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getGameInningsHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
