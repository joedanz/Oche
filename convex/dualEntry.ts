// ABOUTME: Dual score entry system where both captains submit scores independently.
// ABOUTME: Compares entries inning-by-inning, auto-confirms matches, flags discrepancies for admin resolution.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

const batterType = v.union(v.literal("home"), v.literal("visitor"));
const sideType = v.union(v.literal("home"), v.literal("visitor"));

interface InningInput {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

interface Discrepancy {
  inningNumber: number;
  batter: "home" | "visitor";
  homeEntry: number;
  visitorEntry: number;
}

export function compareScoreEntries(
  entryA: InningInput[],
  entryB: InningInput[],
): { match: boolean; discrepancies: Discrepancy[] } {
  const discrepancies: Discrepancy[] = [];

  // Build lookup maps keyed by "inningNumber-batter"
  const mapA = new Map<string, number>();
  for (const i of entryA) {
    mapA.set(`${i.inningNumber}-${i.batter}`, i.runs);
  }
  const mapB = new Map<string, number>();
  for (const i of entryB) {
    mapB.set(`${i.inningNumber}-${i.batter}`, i.runs);
  }

  // Check all keys from both maps
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const key of allKeys) {
    const runsA = mapA.get(key);
    const runsB = mapB.get(key);
    if (runsA !== runsB) {
      const [inningStr, batter] = key.split("-");
      discrepancies.push({
        inningNumber: parseInt(inningStr, 10),
        batter: batter as "home" | "visitor",
        homeEntry: runsA ?? -1,
        visitorEntry: runsB ?? -1,
      });
    }
  }

  return { match: discrepancies.length === 0, discrepancies };
}

async function getEntriesForGame(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  return await db
    .query("scoreEntries")
    .filter((q: any) => q.eq(q.field("gameId"), gameId))
    .collect();
}

async function saveInningsFromEntry(
  db: DatabaseWriter,
  gameId: Id<"games">,
  innings: InningInput[],
) {
  // Delete existing innings
  const existing = await db
    .query("innings")
    .filter((q: any) => q.eq(q.field("gameId"), gameId))
    .collect();
  for (const row of existing) {
    await db.delete(row._id);
  }
  // Insert new
  for (const inning of innings) {
    await db.insert("innings", {
      gameId,
      inningNumber: inning.inningNumber,
      batter: inning.batter,
      runs: inning.runs,
      isExtra: inning.isExtra,
    });
  }
}

export async function submitScoreEntryHandler(
  ctx: { db: DatabaseWriter },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    side: "home" | "visitor";
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

  // Delete existing entry from this side
  const existing = await getEntriesForGame(ctx.db as any, args.gameId);
  for (const entry of existing) {
    if (entry.side === args.side) {
      await ctx.db.delete(entry._id);
    }
  }

  // Insert new entry
  await ctx.db.insert("scoreEntries", {
    gameId: args.gameId,
    side: args.side,
    submittedBy: args.userId,
    innings: args.innings,
    status: "pending",
  });

  // Check if both sides have submitted
  const allEntries = await getEntriesForGame(ctx.db as any, args.gameId);
  const homeEntry = allEntries.find((e: any) => e.side === "home");
  const visitorEntry = allEntries.find((e: any) => e.side === "visitor");

  if (homeEntry && visitorEntry) {
    const comparison = compareScoreEntries(homeEntry.innings, visitorEntry.innings);
    if (comparison.match) {
      // Auto-confirm
      await ctx.db.patch(homeEntry._id, { status: "confirmed" });
      await ctx.db.patch(visitorEntry._id, { status: "confirmed" });
      await saveInningsFromEntry(ctx.db, args.gameId, homeEntry.innings);
    } else {
      // Flag discrepancy
      await ctx.db.patch(homeEntry._id, { status: "discrepancy" });
      await ctx.db.patch(visitorEntry._id, { status: "discrepancy" });
    }
  }
}

export async function getScoreEntriesHandler(
  ctx: { db: DatabaseReader },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireLeagueMember(ctx.db as any, args.userId, args.leagueId);
  const entries = await getEntriesForGame(ctx.db, args.gameId);
  return entries.map((e: any) => ({
    _id: e._id,
    side: e.side,
    submittedBy: e.submittedBy,
    innings: e.innings,
    status: e.status,
  }));
}

export async function resolveDiscrepancyHandler(
  ctx: { db: DatabaseWriter },
  args: {
    gameId: Id<"games">;
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    chosenSide?: "home" | "visitor";
    correctedInnings?: InningInput[];
  },
) {
  await requireRole(ctx.db as any, args.userId, args.leagueId, ["admin"]);

  const entries = await getEntriesForGame(ctx.db as any, args.gameId);

  // Determine which innings to save
  let inningsToSave: InningInput[];
  if (args.correctedInnings) {
    inningsToSave = args.correctedInnings;
  } else if (args.chosenSide) {
    const chosen = entries.find((e: any) => e.side === args.chosenSide);
    if (!chosen) throw new Error(`No entry found for ${args.chosenSide} side`);
    inningsToSave = chosen.innings;
  } else {
    throw new Error("Must provide either chosenSide or correctedInnings");
  }

  // Mark all entries as resolved
  for (const entry of entries) {
    await ctx.db.patch(entry._id, { status: "resolved" });
  }

  // Save the resolved innings
  await saveInningsFromEntry(ctx.db, args.gameId, inningsToSave);
}

// Convex wrappers

const inningSchema = v.object({
  inningNumber: v.number(),
  batter: batterType,
  runs: v.number(),
  isExtra: v.boolean(),
});

export const submitScoreEntry = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
    side: sideType,
    innings: v.array(inningSchema),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await submitScoreEntryHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getScoreEntries = query({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await getScoreEntriesHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const resolveDiscrepancy = mutation({
  args: {
    gameId: v.id("games"),
    leagueId: v.id("leagues"),
    chosenSide: v.optional(sideType),
    correctedInnings: v.optional(v.array(inningSchema)),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await resolveDiscrepancyHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
