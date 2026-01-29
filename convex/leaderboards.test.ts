// ABOUTME: Tests for the leaderboards backend query.
// ABOUTME: Validates top-10 rankings across categories with season/all-time views.

import { describe, it, expect, vi } from "vitest";
import { getLeaderboardsHandler, type LeaderboardsData } from "./leaderboards";

function createMockDb(data: {
  players?: any[];
  users?: any[];
  teams?: any[];
  seasons?: any[];
  playerStats?: any[];
  leagueMemberships?: any[];
  leagues?: any[];
}) {
  const tables: Record<string, any[]> = {
    players: data.players ?? [],
    users: data.users ?? [],
    teams: data.teams ?? [],
    seasons: data.seasons ?? [],
    playerStats: data.playerStats ?? [],
    leagueMemberships: data.leagueMemberships ?? [],
    leagues: data.leagues ?? [],
  };

  const db = {
    get: vi.fn(async (id: string) => {
      for (const table of Object.values(tables)) {
        const found = table.find((r) => r._id === id);
        if (found) return found;
      }
      return null;
    }),
    query: vi.fn((tableName: string) => {
      const rows = tables[tableName] ?? [];
      return {
        withIndex: (_name: string, fn?: (q: any) => any) => {
          let filtered = rows;
          if (fn) {
            const eqCalls: [string, any][] = [];
            const q = {
              eq: (field: string, value: any) => {
                eqCalls.push([field, value]);
                return q;
              },
            };
            fn(q);
            filtered = rows.filter((r) =>
              eqCalls.every(([field, value]) => r[field] === value),
            );
          }
          return {
            collect: async () => filtered,
            unique: async () => (filtered.length === 1 ? filtered[0] : null),
          };
        },
        filter: (fn: any) => {
          const filtered = rows.filter((row) => {
            const qWithRow = {
              eq: (a: any, b: any) => {
                const aVal = typeof a === "function" ? a(row) : a;
                const bVal = typeof b === "function" ? b(row) : b;
                return aVal === bVal;
              },
              field: (name: string) => (r: any) => r[name],
              and: (...args: boolean[]) => args.every(Boolean),
              or: (...args: boolean[]) => args.some(Boolean),
            };
            return fn(qWithRow);
          });
          return {
            collect: async () => filtered,
            unique: async () => (filtered.length === 1 ? filtered[0] : null),
          };
        },
        collect: async () => rows,
        unique: async () => (rows.length === 1 ? rows[0] : null),
      };
    }),
  };
  return db;
}

const leagueId = "league1" as any;
const seasonId = "season1" as any;
const userId = "user1" as any;

const defaultMembership = { _id: "mem1", userId, leagueId, role: "player" };
const defaultSeason = { _id: seasonId, leagueId, name: "Spring 2026", isActive: true };

function makePlayer(id: string, userId: string, teamId: string) {
  return { _id: id, userId, teamId, status: "active" };
}

function makeUser(id: string, name: string) {
  return { _id: id, name, email: `${name.toLowerCase()}@test.com` };
}

function makeStats(
  playerId: string,
  sid: string,
  overrides: Partial<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalPlus: number;
    totalMinus: number;
    highInnings: number;
  }> = {},
) {
  return {
    _id: `stats-${playerId}-${sid}`,
    playerId,
    seasonId: sid,
    gamesPlayed: 10,
    wins: 5,
    losses: 5,
    totalPlus: 400,
    totalMinus: 350,
    highInnings: 3,
    ...overrides,
  };
}

describe("getLeaderboardsHandler", () => {
  it("returns top players sorted by each category", async () => {
    const players = [
      makePlayer("p1", "u1", "t1"),
      makePlayer("p2", "u2", "t1"),
      makePlayer("p3", "u3", "t2"),
    ];
    const users = [
      makeUser("u1", "Alice"),
      makeUser("u2", "Bob"),
      makeUser("u3", "Charlie"),
    ];
    const teams = [
      { _id: "t1", name: "Alpha", leagueId },
      { _id: "t2", name: "Beta", leagueId },
    ];
    const stats = [
      makeStats("p1", seasonId, { totalPlus: 500, gamesPlayed: 10, wins: 8, highInnings: 5 }),
      makeStats("p2", seasonId, { totalPlus: 450, gamesPlayed: 10, wins: 6, highInnings: 7 }),
      makeStats("p3", seasonId, { totalPlus: 600, gamesPlayed: 10, wins: 9, highInnings: 3 }),
    ];

    const db = createMockDb({
      players,
      users,
      teams,
      seasons: [defaultSeason],
      playerStats: stats,
      leagueMemberships: [defaultMembership],
    });

    const result = await getLeaderboardsHandler({ db: db as any }, { leagueId, userId, seasonId });

    // Highest average: Charlie (60), Alice (50), Bob (45)
    expect(result.categories[0].name).toBe("Highest Average");
    expect(result.categories[0].entries[0].playerName).toBe("Charlie");

    // Most runs: Charlie (600), Alice (500), Bob (450)
    expect(result.categories[1].name).toBe("Most Runs");
    expect(result.categories[1].entries[0].playerName).toBe("Charlie");

    // Best plus/minus: Alice (500-350=150), Bob (450-350=100), Charlie (600-350=250)
    expect(result.categories[2].name).toBe("Best Plus/Minus");
    expect(result.categories[2].entries[0].playerName).toBe("Charlie");

    // Most high innings: Bob (7), Alice (5), Charlie (3)
    expect(result.categories[3].name).toBe("Most High Innings");
    expect(result.categories[3].entries[0].playerName).toBe("Bob");

    // Most wins: Charlie (9), Alice (8), Bob (6)
    expect(result.categories[4].name).toBe("Most Wins");
    expect(result.categories[4].entries[0].playerName).toBe("Charlie");
  });

  it("limits results to top 10", async () => {
    const players: any[] = [];
    const users: any[] = [];
    const stats: any[] = [];
    for (let i = 0; i < 15; i++) {
      players.push(makePlayer(`p${i}`, `u${i}`, "t1"));
      users.push(makeUser(`u${i}`, `Player${i}`));
      stats.push(makeStats(`p${i}`, seasonId, { totalPlus: i * 10 }));
    }

    const db = createMockDb({
      players,
      users,
      teams: [{ _id: "t1", name: "Alpha", leagueId }],
      seasons: [defaultSeason],
      playerStats: stats,
      leagueMemberships: [defaultMembership],
    });

    const result = await getLeaderboardsHandler({ db: db as any }, { leagueId, userId, seasonId });

    for (const category of result.categories) {
      expect(category.entries.length).toBeLessThanOrEqual(10);
    }
  });

  it("returns empty when no season found", async () => {
    const db = createMockDb({
      seasons: [],
      leagueMemberships: [defaultMembership],
    });

    const result = await getLeaderboardsHandler({ db: db as any }, { leagueId, userId });

    expect(result.categories).toHaveLength(5);
    for (const cat of result.categories) {
      expect(cat.entries).toEqual([]);
    }
  });

  it("defaults to active season when seasonId not provided", async () => {
    const players = [makePlayer("p1", "u1", "t1")];
    const users = [makeUser("u1", "Alice")];
    const stats = [makeStats("p1", seasonId, { totalPlus: 500 })];

    const db = createMockDb({
      players,
      users,
      teams: [{ _id: "t1", name: "Alpha", leagueId }],
      seasons: [defaultSeason],
      playerStats: stats,
      leagueMemberships: [defaultMembership],
    });

    const result = await getLeaderboardsHandler({ db: db as any }, { leagueId, userId });

    expect(result.categories[0].entries).toHaveLength(1);
    expect(result.categories[0].entries[0].playerName).toBe("Alice");
  });

  it("returns season list for selector", async () => {
    const db = createMockDb({
      seasons: [
        defaultSeason,
        { _id: "season2", leagueId, name: "Fall 2025", isActive: false },
      ],
      leagueMemberships: [defaultMembership],
    });

    const result = await getLeaderboardsHandler({ db: db as any }, { leagueId, userId });

    expect(result.seasons).toHaveLength(2);
    expect(result.seasons[0].name).toBe("Spring 2026");
  });
});
