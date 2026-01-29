// ABOUTME: Tests for DNP (Did Not Play) and blind score handling logic.
// ABOUTME: Verifies DNP toggling, blind auto-scoring, and points exclusion.

import { describe, it, expect } from "vitest";
import { toggleDnpHandler, applyBlindScoresHandler } from "./dnpBlind";

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
    insert: async (table: string, doc: any) => {
      const id = `${table}-${Date.now()}-${Math.random()}`;
      const record = { _id: id, ...doc };
      if (!data[table]) data[table] = [];
      data[table].push(record);
      return id;
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
    delete: async (id: string) => {
      for (const [tableName, table] of Object.entries(data)) {
        const idx = table.findIndex((r: any) => r._id === id);
        if (idx >= 0) {
          table.splice(idx, 1);
          return;
        }
      }
    },
  };
}

describe("toggleDnpHandler", () => {
  it("marks a game as DNP and clears winner", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" }],
    };
    const db = makeDb(data);

    await toggleDnpHandler(
      { db: db as any },
      { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any, isDnp: true },
    );

    expect(data.games[0].isDnp).toBe(true);
    expect(data.games[0].winner).toBeUndefined();
  });

  it("unmarks DNP on a game", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", isDnp: true, winner: null }],
    };
    const db = makeDb(data);

    await toggleDnpHandler(
      { db: db as any },
      { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any, isDnp: false },
    );

    expect(data.games[0].isDnp).toBe(false);
  });

  it("throws for non-existent game", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      games: [],
    };
    const db = makeDb(data);

    await expect(
      toggleDnpHandler(
        { db: db as any },
        { gameId: "game-99" as any, leagueId: "league-1" as any, userId: "user-1" as any, isDnp: true },
      ),
    ).rejects.toThrow(/game not found/i);
  });
});

describe("applyBlindScoresHandler", () => {
  it("auto-populates fixed blind scores for a blind game", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      leagues: [{
        _id: "league-1",
        matchConfig: {
          gamesPerMatch: 3,
          pointsPerGameWin: 1,
          bonusForTotal: false,
          extraExclude: true,
          blindRules: { enabled: true, defaultRuns: 0 },
        },
      }],
      matches: [{ _id: "match-1", leagueId: "league-1" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "blind" }],
      innings: [],
    };
    const db = makeDb(data);

    await applyBlindScoresHandler(
      { db: db as any },
      { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );

    // Should have created 18 innings (9 home + 9 visitor) with visitor (blind) at 0 runs
    const innings = data.innings;
    expect(innings.length).toBe(18);

    const blindInnings = innings.filter((i: any) => i.batter === "visitor");
    expect(blindInnings.length).toBe(9);
    for (const inn of blindInnings) {
      expect(inn.runs).toBe(0);
    }
  });

  it("uses configured defaultRuns for blind player", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      leagues: [{
        _id: "league-1",
        matchConfig: {
          gamesPerMatch: 3,
          pointsPerGameWin: 1,
          bonusForTotal: false,
          extraExclude: true,
          blindRules: { enabled: true, defaultRuns: 3 },
        },
      }],
      matches: [{ _id: "match-1", leagueId: "league-1" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "blind", visitorPlayerId: "p2" }],
      innings: [],
    };
    const db = makeDb(data);

    await applyBlindScoresHandler(
      { db: db as any },
      { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );

    const blindInnings = data.innings.filter((i: any) => i.batter === "home");
    expect(blindInnings.length).toBe(9);
    for (const inn of blindInnings) {
      expect(inn.runs).toBe(3);
    }
  });

  it("throws if game has no blind player", async () => {
    const data: Record<string, any[]> = {
      leagueMemberships: [{ _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" }],
      leagues: [{
        _id: "league-1",
        matchConfig: {
          gamesPerMatch: 3,
          pointsPerGameWin: 1,
          bonusForTotal: false,
          extraExclude: true,
          blindRules: { enabled: true, defaultRuns: 0 },
        },
      }],
      matches: [{ _id: "match-1", leagueId: "league-1" }],
      games: [{ _id: "game-1", matchId: "match-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2" }],
      innings: [],
    };
    const db = makeDb(data);

    await expect(
      applyBlindScoresHandler(
        { db: db as any },
        { gameId: "game-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
      ),
    ).rejects.toThrow(/no blind player/i);
  });
});
