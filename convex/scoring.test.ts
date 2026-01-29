// ABOUTME: Tests for innings score entry backend handlers.
// ABOUTME: Verifies saving and retrieving innings data for games.

import { describe, it, expect } from "vitest";
import { saveInningsHandler, getGameInningsHandler } from "./scoring";

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
    delete: async (id: string) => {
      for (const [table, rows] of Object.entries(data)) {
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
        withIndex: (_name: string, fn?: any) => ({
          collect: async () => {
            if (!fn) return rows;
            return rows;
          },
          unique: async () => {
            return rows[0] ?? null;
          },
        }),
      };
    },
  };
}

const baseData = () => ({
  leagues: [{ _id: "league-1", name: "Test League" }],
  leagueMemberships: [
    { _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "captain" },
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
  innings: [] as any[],
});

describe("saveInningsHandler", () => {
  it("saves innings for a game", async () => {
    const data = baseData();
    const db = makeDb(data);
    const innings = [
      { inningNumber: 1, batter: "home" as const, runs: 5, isExtra: false },
      { inningNumber: 1, batter: "visitor" as const, runs: 3, isExtra: false },
    ];

    await saveInningsHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        innings,
      },
    );

    expect(data.innings).toHaveLength(2);
    expect(data.innings[0].runs).toBe(5);
    expect(data.innings[1].runs).toBe(3);
  });

  it("replaces existing innings on re-save", async () => {
    const data = baseData();
    data.innings = [
      { _id: "inn-1", gameId: "game-1", inningNumber: 1, batter: "home", runs: 2, isExtra: false },
    ];
    const db = makeDb(data);

    await saveInningsHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        innings: [
          { inningNumber: 1, batter: "home" as const, runs: 7, isExtra: false },
        ],
      },
    );

    // Old innings deleted, new one inserted
    expect(data.innings).toHaveLength(1);
    expect(data.innings[0].runs).toBe(7);
  });

  it("validates runs are 0-9", async () => {
    const data = baseData();
    const db = makeDb(data);

    await expect(
      saveInningsHandler(
        { db: db as any },
        {
          gameId: "game-1" as any,
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          innings: [
            { inningNumber: 1, batter: "home" as const, runs: 12, isExtra: false },
          ],
        },
      ),
    ).rejects.toThrow(/runs must be between 0 and 9/i);
  });
});

describe("getGameInningsHandler", () => {
  it("returns innings sorted by inning number and batter", async () => {
    const data = baseData();
    data.innings = [
      { _id: "inn-2", gameId: "game-1", inningNumber: 2, batter: "home", runs: 4, isExtra: false },
      { _id: "inn-1", gameId: "game-1", inningNumber: 1, batter: "home", runs: 5, isExtra: false },
      { _id: "inn-3", gameId: "game-1", inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
    ];
    const db = makeDb(data);

    const result = await getGameInningsHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      },
    );

    expect(result).toHaveLength(3);
    expect(result[0].inningNumber).toBe(1);
    expect(result[0].batter).toBe("home");
    expect(result[1].inningNumber).toBe(1);
    expect(result[1].batter).toBe("visitor");
    expect(result[2].inningNumber).toBe(2);
  });

  it("returns extra innings alongside regular innings", async () => {
    const data = baseData();
    data.innings = [
      { _id: "inn-1", gameId: "game-1", inningNumber: 1, batter: "home", runs: 5, isExtra: false },
      { _id: "inn-2", gameId: "game-1", inningNumber: 1, batter: "visitor", runs: 5, isExtra: false },
      { _id: "inn-3", gameId: "game-1", inningNumber: 10, batter: "home", runs: 3, isExtra: true },
      { _id: "inn-4", gameId: "game-1", inningNumber: 10, batter: "visitor", runs: 1, isExtra: true },
    ];
    const db = makeDb(data);

    const result = await getGameInningsHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      },
    );

    expect(result).toHaveLength(4);
    expect(result[2].inningNumber).toBe(10);
    expect(result[2].isExtra).toBe(true);
    expect(result[3].inningNumber).toBe(10);
    expect(result[3].isExtra).toBe(true);
  });

  it("returns empty array for game with no innings", async () => {
    const data = baseData();
    const db = makeDb(data);

    const result = await getGameInningsHandler(
      { db: db as any },
      {
        gameId: "game-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      },
    );

    expect(result).toHaveLength(0);
  });
});
