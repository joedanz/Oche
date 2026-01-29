// ABOUTME: Tests for game winner determination logic.
// ABOUTME: Verifies winner calculation from innings data and game record updates.

import { describe, it, expect } from "vitest";
import { determineGameWinner, determineWinnerHandler } from "./gameWinner";

interface Inning {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

function makeInnings(homeRuns: number[], visitorRuns: number[], extraHome: number[] = [], extraVisitor: number[] = []): Inning[] {
  const innings: Inning[] = [];
  for (let i = 0; i < homeRuns.length; i++) {
    innings.push({ inningNumber: i + 1, batter: "home", runs: homeRuns[i], isExtra: false });
    innings.push({ inningNumber: i + 1, batter: "visitor", runs: visitorRuns[i], isExtra: false });
  }
  for (let i = 0; i < extraHome.length; i++) {
    innings.push({ inningNumber: 10 + i, batter: "home", runs: extraHome[i], isExtra: true });
    innings.push({ inningNumber: 10 + i, batter: "visitor", runs: extraVisitor[i], isExtra: true });
  }
  return innings;
}

describe("determineGameWinner", () => {
  it("returns home when home has more regulation runs", () => {
    // Home: 5*9=45, Visitor: 3*9=27
    const innings = makeInnings(
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [3, 3, 3, 3, 3, 3, 3, 3, 3],
    );
    expect(determineGameWinner(innings)).toBe("home");
  });

  it("returns visitor when visitor has more regulation runs", () => {
    const innings = makeInnings(
      [2, 2, 2, 2, 2, 2, 2, 2, 2],
      [4, 4, 4, 4, 4, 4, 4, 4, 4],
    );
    expect(determineGameWinner(innings)).toBe("visitor");
  });

  it("uses extra innings to break regulation tie", () => {
    const innings = makeInnings(
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [3],
      [1],
    );
    expect(determineGameWinner(innings)).toBe("home");
  });

  it("returns tie when regulation tied and no extras played", () => {
    const innings = makeInnings(
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
    );
    expect(determineGameWinner(innings)).toBe("tie");
  });

  it("returns tie when tied after extra innings too", () => {
    const innings = makeInnings(
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [5, 5, 5, 5, 5, 5, 5, 5, 5],
      [3],
      [3],
    );
    expect(determineGameWinner(innings)).toBe("tie");
  });

  it("returns null when no innings data", () => {
    expect(determineGameWinner([])).toBeNull();
  });
});

function makeDb(data: Record<string, any[]>) {
  return {
    get: async (id: string) => {
      for (const table of Object.values(data)) {
        const found = table.find((r: any) => r._id === id);
        if (found) return found;
      }
      return null;
    },
    patch: async (id: string, fields: any) => {
      for (const table of Object.values(data)) {
        const found = table.find((r: any) => r._id === id);
        if (found) Object.assign(found, fields);
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
                field: (name: string) => row[name],
              };
              return fn(q);
            });
          },
        }),
        withIndex: (_name: string) => ({
          collect: async () => rows,
          unique: async () => rows[0] ?? null,
        }),
      };
    },
  };
}

describe("determineWinnerHandler", () => {
  it("sets winner on the game record", async () => {
    const data: Record<string, any[]> = {
      leagues: [{ _id: "league-1" }],
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2" }],
      innings: [
        { _id: "i1", gameId: "game-1", inningNumber: 1, batter: "home", runs: 9, isExtra: false },
        { _id: "i2", gameId: "game-1", inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
      ],
    };
    const db = makeDb(data);

    const result = await determineWinnerHandler(
      { db: db as any },
      { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );

    expect(result).toBe("home");
    expect(data.games[0].winner).toBe("home");
  });

  it("throws for non-existent game", async () => {
    const data: Record<string, any[]> = {
      leagues: [{ _id: "league-1" }],
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      games: [],
      innings: [],
    };
    const db = makeDb(data);

    await expect(
      determineWinnerHandler(
        { db: db as any },
        { gameId: "game-99" as any, leagueId: "league-1" as any, userId: "user-1" as any },
      ),
    ).rejects.toThrow(/game not found/i);
  });
});
