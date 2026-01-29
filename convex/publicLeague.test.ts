// ABOUTME: Tests for public league data queries and visibility toggle.
// ABOUTME: Validates that public leagues expose data without auth and private leagues do not.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toggleVisibilityHandler,
  getPublicLeagueDataHandler,
} from "./publicLeague";

function createMockDb(data: Record<string, any[]>) {
  const store = { ...data };
  return {
    get: vi.fn(async (id: string) => {
      for (const table of Object.values(store)) {
        const found = table.find((r: any) => r._id === id);
        if (found) return found;
      }
      return null;
    }),
    patch: vi.fn(async () => {}),
    query: vi.fn((tableName: string) => {
      const rows = store[tableName] || [];
      return {
        withIndex: vi.fn((_name: string, fn?: (q: any) => any) => {
          let filtered = rows;
          if (fn) {
            const eqs: Record<string, any> = {};
            const q = {
              eq: (field: string, value: any) => {
                eqs[field] = value;
                return q;
              },
            };
            fn(q);
            filtered = rows.filter((r: any) =>
              Object.entries(eqs).every(([k, v]) => r[k] === v),
            );
          }
          return {
            collect: vi.fn(async () => filtered),
            unique: vi.fn(async () => filtered[0] || null),
            filter: vi.fn(() => ({
              collect: vi.fn(async () => filtered),
            })),
          };
        }),
        filter: vi.fn((fn: (q: any) => any) => {
          const q = {
            eq: (a: any, b: any) => a === b,
            field: (name: string) => (row: any) => row[name],
            and: (...args: any[]) => args.every(Boolean),
          };
          // Simple filter: just return all rows (tests set up specific data)
          return {
            collect: vi.fn(async () => rows),
          };
        }),
        collect: vi.fn(async () => rows),
      };
    }),
  };
}

describe("toggleVisibilityHandler", () => {
  it("sets isPublic to true on a league", async () => {
    const db = createMockDb({
      leagues: [{ _id: "league1", name: "Test", isPublic: false }],
      leagueMemberships: [
        { _id: "m1", userId: "user1", leagueId: "league1", role: "admin" },
      ],
    });

    await toggleVisibilityHandler(
      { db: db as any },
      { leagueId: "league1" as any, userId: "user1" as any, isPublic: true },
    );

    expect(db.patch).toHaveBeenCalledWith("league1", { isPublic: true });
  });

  it("sets isPublic to false on a league", async () => {
    const db = createMockDb({
      leagues: [{ _id: "league1", name: "Test", isPublic: true }],
      leagueMemberships: [
        { _id: "m1", userId: "user1", leagueId: "league1", role: "admin" },
      ],
    });

    await toggleVisibilityHandler(
      { db: db as any },
      { leagueId: "league1" as any, userId: "user1" as any, isPublic: false },
    );

    expect(db.patch).toHaveBeenCalledWith("league1", { isPublic: false });
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb({
      leagues: [{ _id: "league1", name: "Test" }],
      leagueMemberships: [
        { _id: "m1", userId: "user1", leagueId: "league1", role: "player" },
      ],
    });

    await expect(
      toggleVisibilityHandler(
        { db: db as any },
        { leagueId: "league1" as any, userId: "user1" as any, isPublic: true },
      ),
    ).rejects.toThrow(/permission/i);
  });
});

describe("getPublicLeagueDataHandler", () => {
  it("returns standings, schedule, and results for a public league", async () => {
    const db = createMockDb({
      leagues: [
        {
          _id: "league1",
          name: "Public League",
          isPublic: true,
          matchConfig: { pointsPerGameWin: 1, bonusForTotal: false },
        },
      ],
      seasons: [
        { _id: "s1", leagueId: "league1", name: "Spring", isActive: true, startDate: "2026-01-01", endDate: "2026-06-01" },
      ],
      teams: [
        { _id: "t1", leagueId: "league1", name: "Eagles" },
        { _id: "t2", leagueId: "league1", name: "Hawks" },
      ],
      matches: [],
      games: [],
      innings: [],
      divisions: [],
    });

    const result = await getPublicLeagueDataHandler({ db: db as any }, { leagueId: "league1" as any });

    expect(result).not.toBeNull();
    expect(result!.leagueName).toBe("Public League");
    expect(result!.standings).toBeDefined();
    expect(result!.schedule).toBeDefined();
    expect(result!.recentResults).toBeDefined();
  });

  it("returns null for a private league", async () => {
    const db = createMockDb({
      leagues: [{ _id: "league1", name: "Private League", isPublic: false }],
    });

    const result = await getPublicLeagueDataHandler({ db: db as any }, { leagueId: "league1" as any });

    expect(result).toBeNull();
  });

  it("returns null for a league without isPublic field", async () => {
    const db = createMockDb({
      leagues: [{ _id: "league1", name: "Old League" }],
    });

    const result = await getPublicLeagueDataHandler({ db: db as any }, { leagueId: "league1" as any });

    expect(result).toBeNull();
  });
});
