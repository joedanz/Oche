// ABOUTME: Core database schema for the Oche darts league platform.
// ABOUTME: Defines all tables for users, leagues, teams, matches, scoring, and stats.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const role = v.union(v.literal("admin"), v.literal("captain"), v.literal("player"));
const matchStatus = v.union(
  v.literal("scheduled"),
  v.literal("in_progress"),
  v.literal("completed"),
);
const playerStatus = v.union(v.literal("active"), v.literal("inactive"));
const batter = v.union(v.literal("home"), v.literal("visitor"));
const blindRules = v.object({
  enabled: v.boolean(),
  defaultRuns: v.number(),
});
const matchConfig = v.object({
  gamesPerMatch: v.number(),
  pointsPerGameWin: v.number(),
  bonusForTotal: v.boolean(),
  extraExclude: v.boolean(),
  blindRules,
});
const handicapRecalcFrequency = v.union(
  v.literal("weekly"),
  v.literal("per-match"),
  v.literal("manual"),
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }),

  leagues: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    matchConfig,
    handicapEnabled: v.boolean(),
    handicapPercent: v.optional(v.number()),
    handicapRecalcFrequency: v.optional(handicapRecalcFrequency),
    leagueFee: v.optional(v.number()),
    weeklyFee: v.optional(v.number()),
    feeSchedule: v.optional(
      v.union(
        v.literal("one-time"),
        v.literal("weekly"),
        v.literal("per-match"),
      ),
    ),
    isPublic: v.optional(v.boolean()),
  }),

  leagueMemberships: defineTable({
    userId: v.id("users"),
    leagueId: v.id("leagues"),
    role,
  }).index("by_user_league", ["userId", "leagueId"]),

  invites: defineTable({
    leagueId: v.id("leagues"),
    code: v.string(),
    role,
    createdBy: v.id("users"),
    expiresAt: v.number(),
    used: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_league", ["leagueId"]),

  seasons: defineTable({
    leagueId: v.id("leagues"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    isActive: v.boolean(),
  }).index("by_league", ["leagueId"]),

  divisions: defineTable({
    leagueId: v.id("leagues"),
    name: v.string(),
  }).index("by_league", ["leagueId"]),

  teams: defineTable({
    name: v.string(),
    captainId: v.optional(v.id("players")),
    venue: v.optional(v.string()),
    leagueId: v.id("leagues"),
    divisionId: v.optional(v.id("divisions")),
  }),

  players: defineTable({
    userId: v.id("users"),
    teamId: v.id("teams"),
    status: playerStatus,
  }),

  matches: defineTable({
    leagueId: v.id("leagues"),
    seasonId: v.id("seasons"),
    homeTeamId: v.id("teams"),
    visitorTeamId: v.id("teams"),
    date: v.string(),
    status: matchStatus,
    pairings: v.array(
      v.object({
        slot: v.number(),
        homePlayerId: v.union(v.id("players"), v.literal("blind")),
        visitorPlayerId: v.union(v.id("players"), v.literal("blind")),
      }),
    ),
    totals: v.optional(
      v.object({
        homePlus: v.number(),
        visitorPlus: v.number(),
        bonusWinner: v.optional(v.union(v.literal("home"), v.literal("visitor"))),
      }),
    ),
    handicapPercent: v.optional(v.number()),
  }).index("by_league", ["leagueId"]),

  games: defineTable({
    matchId: v.id("matches"),
    slot: v.number(),
    homePlayerId: v.union(v.id("players"), v.literal("blind")),
    visitorPlayerId: v.union(v.id("players"), v.literal("blind")),
    winner: v.optional(v.union(v.literal("home"), v.literal("visitor"), v.literal("tie"))),
    isDnp: v.optional(v.boolean()),
    handicapPercent: v.optional(v.number()),
  }),

  innings: defineTable({
    gameId: v.id("games"),
    inningNumber: v.number(),
    batter,
    runs: v.number(),
    isExtra: v.boolean(),
  }),

  scoreEntries: defineTable({
    gameId: v.id("games"),
    side: v.union(v.literal("home"), v.literal("visitor")),
    submittedBy: v.id("users"),
    innings: v.array(
      v.object({
        inningNumber: v.number(),
        batter: batter,
        runs: v.number(),
        isExtra: v.boolean(),
      }),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("discrepancy"),
      v.literal("resolved"),
    ),
  }),

  importTemplates: defineTable({
    leagueId: v.id("leagues"),
    name: v.string(),
    mapping: v.object({
      playerName: v.optional(v.number()),
      innings: v.array(v.number()),
      plus: v.optional(v.number()),
      minus: v.optional(v.number()),
    }),
  }),

  payments: defineTable({
    leagueId: v.id("leagues"),
    playerId: v.id("players"),
    amount: v.number(),
    note: v.string(),
    recordedBy: v.id("users"),
    recordedAt: v.number(),
  }).index("by_league", ["leagueId"]),

  tournaments: defineTable({
    leagueId: v.id("leagues"),
    name: v.string(),
    date: v.string(),
    format: v.literal("single-elimination"),
    participantType: v.union(v.literal("player"), v.literal("team")),
    rounds: v.number(),
    bracket: v.array(
      v.object({
        matchIndex: v.number(),
        round: v.number(),
        participant1Id: v.union(v.string(), v.null()),
        participant1Name: v.union(v.string(), v.null()),
        participant1Seed: v.union(v.number(), v.null()),
        participant2Id: v.union(v.string(), v.null()),
        participant2Name: v.union(v.string(), v.null()),
        participant2Seed: v.union(v.number(), v.null()),
        winnerId: v.union(v.string(), v.null()),
      }),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  }).index("by_league", ["leagueId"]),

  playerStats: defineTable({
    playerId: v.id("players"),
    seasonId: v.id("seasons"),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    totalPlus: v.number(),
    totalMinus: v.number(),
    highInnings: v.number(),
  }),
});
