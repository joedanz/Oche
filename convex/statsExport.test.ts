// ABOUTME: Tests for the stats export backend query.
// ABOUTME: Validates player stats retrieval with enriched names and computed averages.

import { describe, it, expect, vi } from "vitest";
import { getExportDataHandler } from "./statsExport";

function createMockDb(data: {
  players?: any[];
  users?: any[];
  teams?: any[];
  seasons?: any[];
  playerStats?: any[];
  leagueMemberships?: any[];
}) {
  const tables: Record<string, any[]> = {
    players: data.players ?? [],
    users: data.users ?? [],
    teams: data.teams ?? [],
    seasons: data.seasons ?? [],
    playerStats: data.playerStats ?? [],
    leagueMemberships: data.leagueMemberships ?? [],
  };

  return {
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
            };
            return fn(qWithRow);
          });
          return {
            collect: async () => filtered,
            unique: async () => (filtered.length === 1 ? filtered[0] : null),
          };
        },
        collect: async () => rows,
      };
    }),
  };
}

const leagueId = "league1" as any;
const seasonId = "season1" as any;
const userId = "user1" as any;

describe("getExportDataHandler", () => {
  it("returns enriched player stats sorted by average", async () => {
    const db = createMockDb({
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      teams: [{ _id: "t1", name: "Aces", leagueId }],
      players: [
        { _id: "p1", userId: "u1", teamId: "t1", status: "active" },
        { _id: "p2", userId: "u2", teamId: "t1", status: "active" },
      ],
      users: [
        { _id: "u1", name: "Alice", email: "alice@test.com" },
        { _id: "u2", name: "Bob", email: "bob@test.com" },
      ],
      playerStats: [
        { _id: "ps1", playerId: "p1", seasonId, gamesPlayed: 10, wins: 8, losses: 2, totalPlus: 500, totalMinus: 300, highInnings: 5 },
        { _id: "ps2", playerId: "p2", seasonId, gamesPlayed: 10, wins: 4, losses: 6, totalPlus: 400, totalMinus: 350, highInnings: 2 },
      ],
    });

    const result = await getExportDataHandler({ db: db as any }, { leagueId, userId });

    expect(result.playerStats).toHaveLength(2);
    expect(result.playerStats[0].playerName).toBe("Alice");
    expect(result.playerStats[0].average).toBe(50);
    expect(result.playerStats[0].plusMinus).toBe(200);
    expect(result.playerStats[1].playerName).toBe("Bob");
  });

  it("returns empty stats when no active season", async () => {
    const db = createMockDb({
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      seasons: [],
    });

    const result = await getExportDataHandler({ db: db as any }, { leagueId, userId });
    expect(result.playerStats).toEqual([]);
  });

  it("returns seasons list", async () => {
    const db = createMockDb({
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      seasons: [
        { _id: seasonId, leagueId, name: "Spring 2026", isActive: true },
        { _id: "s2", leagueId, name: "Fall 2025", isActive: false },
      ],
    });

    const result = await getExportDataHandler({ db: db as any }, { leagueId, userId });
    expect(result.seasons).toHaveLength(2);
  });
});
