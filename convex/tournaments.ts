// ABOUTME: Tournament management queries and mutations with admin-only access.
// ABOUTME: Supports creating tournaments, listing them, and managing bracket state.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireLeagueMember } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function getTournamentsHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db
    .query("tournaments")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .collect();
}

export async function createTournamentHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    name: string;
    date: string;
    format: "single-elimination";
    participantIds: string[];
    participantType: "player" | "team";
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.participantIds.length < 2) {
    throw new Error("Need at least 2 participants");
  }

  // Build seeded participants
  const participants = await Promise.all(
    args.participantIds.map(async (id, index) => {
      let name = "Unknown";
      if (args.participantType === "player") {
        const player = await ctx.db.get(id as Id<"players">);
        if (player) {
          const user = await ctx.db.get(player.userId);
          name = user?.name || user?.email || "Unknown";
        }
      } else {
        const team = await ctx.db.get(id as Id<"teams">);
        name = team?.name || "Unknown";
      }
      return { id, name, seed: index + 1 };
    }),
  );

  // Generate bracket structure
  const bracketSize = nextPowerOf2(participants.length);
  const rounds = Math.log2(bracketSize);
  const positions = buildSeededPositions(bracketSize);
  const numFirstRoundMatches = bracketSize / 2;

  const bracketMatches: Array<{
    matchIndex: number;
    round: number;
    participant1Id: string | null;
    participant1Name: string | null;
    participant1Seed: number | null;
    participant2Id: string | null;
    participant2Name: string | null;
    participant2Seed: number | null;
    winnerId: string | null;
  }> = [];

  for (let i = 0; i < numFirstRoundMatches; i++) {
    const pos1 = positions[i * 2];
    const pos2 = positions[i * 2 + 1];
    const p1 = pos1 <= participants.length ? participants[pos1 - 1] : null;
    const p2 = pos2 <= participants.length ? participants[pos2 - 1] : null;

    let winnerId: string | null = null;
    if (p1 && !p2) winnerId = p1.id;
    if (!p1 && p2) winnerId = p2.id;

    bracketMatches.push({
      matchIndex: i,
      round: 1,
      participant1Id: p1?.id ?? null,
      participant1Name: p1?.name ?? null,
      participant1Seed: p1?.seed ?? null,
      participant2Id: p2?.id ?? null,
      participant2Name: p2?.name ?? null,
      participant2Seed: p2?.seed ?? null,
      winnerId,
    });
  }

  let matchCounter = numFirstRoundMatches;
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let j = 0; j < matchesInRound; j++) {
      bracketMatches.push({
        matchIndex: matchCounter++,
        round,
        participant1Id: null,
        participant1Name: null,
        participant1Seed: null,
        participant2Id: null,
        participant2Name: null,
        participant2Seed: null,
        winnerId: null,
      });
    }
  }

  return await ctx.db.insert("tournaments", {
    leagueId: args.leagueId,
    name: args.name,
    date: args.date,
    format: args.format,
    participantType: args.participantType,
    rounds,
    bracket: bracketMatches,
    status: "pending",
  });
}

export async function getTournamentDetailHandler(
  ctx: { db: DatabaseReader },
  args: { leagueId: Id<"leagues">; userId: Id<"users">; tournamentId: Id<"tournaments"> },
) {
  await requireLeagueMember(ctx.db, args.userId, args.leagueId);
  return await ctx.db.get(args.tournamentId);
}

// Reused from bracketGenerator (duplicated here for Convex server-side use)
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function buildSeededPositions(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];
  const positions: number[] = [1, 2];
  while (positions.length < size) {
    const nextRound: number[] = [];
    const currentMax = positions.length * 2 + 1;
    for (const seed of positions) {
      nextRound.push(seed);
      nextRound.push(currentMax - seed);
    }
    positions.length = 0;
    positions.push(...nextRound);
  }
  return positions;
}

export const getTournaments = query({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getTournamentsHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const createTournament = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.string(),
    date: v.string(),
    format: v.literal("single-elimination"),
    participantIds: v.array(v.string()),
    participantType: v.union(v.literal("player"), v.literal("team")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return createTournamentHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getTournamentDetail = query({
  args: {
    leagueId: v.id("leagues"),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getTournamentDetailHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
      tournamentId: args.tournamentId,
    });
  },
});
