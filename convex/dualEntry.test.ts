// ABOUTME: Tests for dual score entry with discrepancy flagging.
// ABOUTME: Verifies independent captain submissions, comparison logic, and admin resolution.

import { describe, it, expect } from "vitest";
import {
  submitScoreEntryHandler,
  getScoreEntriesHandler,
  compareScoreEntries,
  resolveDiscrepancyHandler,
} from "./dualEntry";

function makeDb(data: Record<string, any[]>) {
  let nextId = 100;
  return {
    get: async (id: string) => {
      for (const table of Object.values(data)) {
        const found = table.find((r: any) => r._id === id);
        if (found) return found;
      }
      return null;
    },
    insert: async (table: string, doc: any) => {
      const id = `${table}-${nextId++}`;
      const row = { _id: id, ...doc };
      if (!data[table]) data[table] = [];
      data[table].push(row);
      return id;
    },
    patch: async (id: string, fields: any) => {
      for (const table of Object.values(data)) {
        const found = table.find((r: any) => r._id === id);
        if (found) {
          Object.assign(found, fields);
          return;
        }
      }
    },
    delete: async (id: string) => {
      for (const [, rows] of Object.entries(data)) {
        const idx = rows.findIndex((r: any) => r._id === id);
        if (idx >= 0) {
          rows.splice(idx, 1);
          return;
        }
      }
    },
    query: (table: string) => {
      const rows = data[table] ?? [];
      return {
        filter: (fn: any) => ({
          collect: async () => {
            return rows.filter((row: any) => {
              const q = {
                eq: (a: any, b: any) => a === b,
                and: (...args: boolean[]) => args.every(Boolean),
                field: (name: string) => row[name],
              };
              return fn(q);
            });
          },
        }),
        withIndex: (_name: string, fn?: any) => {
          let filtered = rows;
          if (fn) {
            const conditions: Record<string, any> = {};
            const q = {
              eq: (field: string, value: any) => {
                conditions[field] = value;
                return q;
              },
            };
            fn(q);
            filtered = rows.filter((row: any) =>
              Object.entries(conditions).every(([k, v]) => row[k] === v),
            );
          }
          return {
            collect: async () => filtered,
            unique: async () => filtered[0] ?? null,
          };
        },
      };
    },
  };
}

const baseData = () => ({
  leagues: [{ _id: "league-1", name: "Test League" }],
  leagueMemberships: [
    { _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "captain" },
    { _id: "mem-2", userId: "user-2", leagueId: "league-1", role: "captain" },
    { _id: "mem-3", userId: "user-admin", leagueId: "league-1", role: "admin" },
  ],
  matches: [
    {
      _id: "match-1",
      leagueId: "league-1",
      seasonId: "season-1",
      homeTeamId: "team-1",
      visitorTeamId: "team-2",
      date: "2026-02-01",
      status: "scheduled",
      pairings: [],
    },
  ],
  games: [
    {
      _id: "game-1",
      matchId: "match-1",
      slot: 1,
      homePlayerId: "p1",
      visitorPlayerId: "p3",
    },
  ],
  teams: [
    { _id: "team-1", name: "Team A", leagueId: "league-1", captainId: "p-cap1" },
    { _id: "team-2", name: "Team B", leagueId: "league-1", captainId: "p-cap2" },
  ],
  players: [
    { _id: "p-cap1", userId: "user-1", teamId: "team-1", status: "active" },
    { _id: "p-cap2", userId: "user-2", teamId: "team-2", status: "active" },
  ],
  scoreEntries: [] as any[],
  innings: [] as any[],
});

const sampleInnings = [
  { inningNumber: 1, batter: "home" as const, runs: 5, isExtra: false },
  { inningNumber: 1, batter: "visitor" as const, runs: 3, isExtra: false },
  { inningNumber: 2, batter: "home" as const, runs: 7, isExtra: false },
  { inningNumber: 2, batter: "visitor" as const, runs: 4, isExtra: false },
];

describe("submitScoreEntryHandler", () => {
  it("saves a score entry for the home side", async () => {
    const data = baseData();
    const db = makeDb(data);

    await submitScoreEntryHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        side: "home",
        innings: sampleInnings,
      },
    );

    expect(data.scoreEntries).toHaveLength(1);
    expect(data.scoreEntries[0].side).toBe("home");
    expect(data.scoreEntries[0].innings).toEqual(sampleInnings);
    expect(data.scoreEntries[0].status).toBe("pending");
  });

  it("replaces an existing entry from the same side", async () => {
    const data = baseData();
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "home",
        submittedBy: "user-1",
        innings: [{ inningNumber: 1, batter: "home", runs: 1, isExtra: false }],
        status: "pending",
      },
    ];
    const db = makeDb(data);

    await submitScoreEntryHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        side: "home",
        innings: sampleInnings,
      },
    );

    // Old entry deleted, new one inserted
    const homeEntries = data.scoreEntries.filter(
      (e: any) => e.gameId === "game-1" && e.side === "home",
    );
    expect(homeEntries).toHaveLength(1);
    expect(homeEntries[0].innings).toEqual(sampleInnings);
  });

  it("auto-confirms when both entries match", async () => {
    const data = baseData();
    // Visitor already submitted
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "visitor",
        submittedBy: "user-2",
        innings: sampleInnings,
        status: "pending",
      },
    ];
    const db = makeDb(data);

    await submitScoreEntryHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        side: "home",
        innings: sampleInnings,
      },
    );

    // Both entries should now be confirmed
    const entries = data.scoreEntries.filter((e: any) => e.gameId === "game-1");
    expect(entries.every((e: any) => e.status === "confirmed")).toBe(true);

    // Confirmed scores should be saved as actual innings
    expect(data.innings.length).toBeGreaterThan(0);
  });

  it("flags discrepancy when entries differ", async () => {
    const data = baseData();
    const differentInnings = [
      { inningNumber: 1, batter: "home" as const, runs: 9, isExtra: false },
      { inningNumber: 1, batter: "visitor" as const, runs: 3, isExtra: false },
      { inningNumber: 2, batter: "home" as const, runs: 7, isExtra: false },
      { inningNumber: 2, batter: "visitor" as const, runs: 4, isExtra: false },
    ];
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "visitor",
        submittedBy: "user-2",
        innings: differentInnings,
        status: "pending",
      },
    ];
    const db = makeDb(data);

    await submitScoreEntryHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        side: "home",
        innings: sampleInnings,
      },
    );

    const entries = data.scoreEntries.filter((e: any) => e.gameId === "game-1");
    expect(entries.every((e: any) => e.status === "discrepancy")).toBe(true);
    // Should NOT save to innings table
    expect(data.innings).toHaveLength(0);
  });
});

describe("compareScoreEntries", () => {
  it("returns matching when innings are identical", () => {
    const result = compareScoreEntries(sampleInnings, sampleInnings);
    expect(result.match).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("returns discrepancies with specific inning details", () => {
    const other = [
      { inningNumber: 1, batter: "home" as const, runs: 9, isExtra: false },
      { inningNumber: 1, batter: "visitor" as const, runs: 3, isExtra: false },
      { inningNumber: 2, batter: "home" as const, runs: 7, isExtra: false },
      { inningNumber: 2, batter: "visitor" as const, runs: 4, isExtra: false },
    ];
    const result = compareScoreEntries(sampleInnings, other);
    expect(result.match).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]).toEqual({
      inningNumber: 1,
      batter: "home",
      homeEntry: 5,
      visitorEntry: 9,
    });
  });

  it("detects length mismatch as discrepancy", () => {
    const shorter = sampleInnings.slice(0, 2);
    const result = compareScoreEntries(sampleInnings, shorter);
    expect(result.match).toBe(false);
  });
});

describe("getScoreEntriesHandler", () => {
  it("returns score entries for a game", async () => {
    const data = baseData();
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "home",
        submittedBy: "user-1",
        innings: sampleInnings,
        status: "pending",
      },
    ];
    const db = makeDb(data);

    const result = await getScoreEntriesHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0].side).toBe("home");
  });
});

describe("resolveDiscrepancyHandler", () => {
  it("admin resolves by choosing one entry", async () => {
    const data = baseData();
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "home",
        submittedBy: "user-1",
        innings: sampleInnings,
        status: "discrepancy",
      },
      {
        _id: "se-2",
        gameId: "game-1",
        side: "visitor",
        submittedBy: "user-2",
        innings: [
          { inningNumber: 1, batter: "home", runs: 9, isExtra: false },
          { inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
        ],
        status: "discrepancy",
      },
    ];
    const db = makeDb(data);

    await resolveDiscrepancyHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-admin" as any,
        chosenSide: "home",
      },
    );

    // Both entries marked resolved
    expect(data.scoreEntries.every((e: any) => e.status === "resolved")).toBe(true);
    // Chosen entry's innings saved to actual innings table
    expect(data.innings.length).toBeGreaterThan(0);
    expect(data.innings[0].runs).toBe(5); // from home entry
  });

  it("admin resolves by providing a correction", async () => {
    const data = baseData();
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "home",
        submittedBy: "user-1",
        innings: sampleInnings,
        status: "discrepancy",
      },
      {
        _id: "se-2",
        gameId: "game-1",
        side: "visitor",
        submittedBy: "user-2",
        innings: sampleInnings,
        status: "discrepancy",
      },
    ];
    const correctedInnings = [
      { inningNumber: 1, batter: "home" as const, runs: 6, isExtra: false },
      { inningNumber: 1, batter: "visitor" as const, runs: 2, isExtra: false },
    ];
    const db = makeDb(data);

    await resolveDiscrepancyHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-admin" as any,
        correctedInnings,
      },
    );

    expect(data.scoreEntries.every((e: any) => e.status === "resolved")).toBe(true);
    expect(data.innings[0].runs).toBe(6);
  });

  it("rejects non-admin resolution", async () => {
    const data = baseData();
    data.scoreEntries = [
      {
        _id: "se-1",
        gameId: "game-1",
        side: "home",
        submittedBy: "user-1",
        innings: sampleInnings,
        status: "discrepancy",
      },
    ];
    const db = makeDb(data);

    await expect(
      resolveDiscrepancyHandler(
        { db: db as any },
        {
          gameId: "game-1" as any,
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          chosenSide: "home",
        },
      ),
    ).rejects.toThrow();
  });
});
