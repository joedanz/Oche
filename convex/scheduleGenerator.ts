// ABOUTME: Round-robin schedule generation algorithm and mutation.
// ABOUTME: Creates balanced matchups with fair home/away distribution.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

/**
 * Circle method round-robin: fix team[0], rotate the rest.
 * Returns rounds of [home, visitor] pairs.
 */
export function generateRoundRobin(teamIds: string[]): [string, string][][] {
  if (teamIds.length < 2) {
    throw new Error("Need at least 2 teams to generate a schedule");
  }

  const teams = [...teamIds];
  const hasGhost = teams.length % 2 !== 0;
  if (hasGhost) {
    teams.push("__bye__");
  }

  const n = teams.length;
  const rounds: [string, string][][] = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const matches: [string, string][] = [];

    // First match: fixed vs rotating[0]
    const opponent = rotating[0];
    if (opponent !== "__bye__" && fixed !== "__bye__") {
      if (round % 2 === 0) {
        matches.push([fixed, opponent]);
      } else {
        matches.push([opponent, fixed]);
      }
    }

    // Remaining matches: pair from ends of rotating array
    for (let i = 1; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[rotating.length - i];
      if (a !== "__bye__" && b !== "__bye__") {
        if ((round + i) % 2 === 0) {
          matches.push([a, b]);
        } else {
          matches.push([b, a]);
        }
      }
    }

    rounds.push(matches);

    // Rotate: move last element to front
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function generateScheduleHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    seasonId: Id<"seasons">;
    teamIds: Id<"teams">[];
    startDate: string;
    weeksBetweenRounds: number;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const rounds = generateRoundRobin(args.teamIds as string[]);
  const matchIds: string[] = [];

  for (let r = 0; r < rounds.length; r++) {
    const roundDate = addDays(args.startDate, r * args.weeksBetweenRounds * 7);

    for (const [home, visitor] of rounds[r]) {
      const id = await ctx.db.insert("matches", {
        leagueId: args.leagueId,
        seasonId: args.seasonId,
        homeTeamId: home as Id<"teams">,
        visitorTeamId: visitor as Id<"teams">,
        date: roundDate,
        status: "scheduled",
        pairings: [],
      });
      matchIds.push(id);
    }
  }

  return matchIds;
}

export const generateSchedule = mutation({
  args: {
    leagueId: v.id("leagues"),
    seasonId: v.id("seasons"),
    teamIds: v.array(v.id("teams")),
    startDate: v.string(),
    weeksBetweenRounds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await generateScheduleHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
