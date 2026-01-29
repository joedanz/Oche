// ABOUTME: Tests for match detail query handler.
// ABOUTME: Verifies enriched match data including team names, pairings with player names, and game results.

import { describe, it, expect } from "vitest";
import { getMatchDetailHandler } from "./matchDetail";

function makeDb(data: Record<string, any[]>) {
  return {
    get: async (id: string) => {
      for (const table of Object.values(data)) {
        const found = table.find((r: any) => r._id === id);
        if (found) return found;
      }
      return null;
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
        withIndex: (_name: string, fn?: any) => ({
          collect: async () => {
            if (!fn) return rows;
            // Simple index simulation
            return rows.filter((row: any) => {
              const q = {
                eq: (field: string, value: any) => {
                  // field is actually the value from the index
                  return row[field] === value || true;
                },
              };
              fn(q);
              return true;
            });
          },
          unique: async () => {
            return rows[0] ?? null;
          },
        }),
      };
    },
  };
}

const baseData = {
  leagues: [{ _id: "league-1", name: "Test League" }],
  leagueMemberships: [
    { _id: "mem-1", userId: "user-1", leagueId: "league-1", role: "admin" },
  ],
  teams: [
    { _id: "team-1", name: "Eagles", leagueId: "league-1" },
    { _id: "team-2", name: "Hawks", leagueId: "league-1" },
  ],
  users: [
    { _id: "user-1", name: "Alice", email: "alice@test.com" },
    { _id: "user-2", name: "Bob", email: "bob@test.com" },
    { _id: "user-3", name: "Charlie", email: "charlie@test.com" },
    { _id: "user-4", name: "Diana", email: "diana@test.com" },
  ],
  players: [
    { _id: "p1", userId: "user-1", teamId: "team-1", status: "active" },
    { _id: "p2", userId: "user-2", teamId: "team-1", status: "active" },
    { _id: "p3", userId: "user-3", teamId: "team-2", status: "active" },
    { _id: "p4", userId: "user-4", teamId: "team-2", status: "active" },
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
      pairings: [
        { slot: 1, homePlayerId: "p1", visitorPlayerId: "p3" },
        { slot: 2, homePlayerId: "p2", visitorPlayerId: "blind" },
      ],
      totals: { homePlus: 45, visitorPlus: 38, bonusWinner: "home" },
    },
  ],
  games: [
    {
      _id: "game-1",
      matchId: "match-1",
      slot: 1,
      homePlayerId: "p1",
      visitorPlayerId: "p3",
      winner: "home",
    },
    {
      _id: "game-2",
      matchId: "match-1",
      slot: 2,
      homePlayerId: "p2",
      visitorPlayerId: "blind",
      winner: "home",
    },
  ],
  innings: [],
  seasons: [{ _id: "season-1", leagueId: "league-1", name: "Spring 2026" }],
};

describe("getMatchDetailHandler", () => {
  it("returns match with team names and date", async () => {
    const db = makeDb(baseData);
    const result = await getMatchDetailHandler(
      { db: db as any },
      { matchId: "match-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );
    expect(result.homeTeamName).toBe("Eagles");
    expect(result.visitorTeamName).toBe("Hawks");
    expect(result.match.date).toBe("2026-02-01");
  });

  it("returns pairings with resolved player names", async () => {
    const db = makeDb(baseData);
    const result = await getMatchDetailHandler(
      { db: db as any },
      { matchId: "match-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );
    expect(result.pairings).toHaveLength(2);
    expect(result.pairings[0].homePlayerName).toBe("Alice");
    expect(result.pairings[0].visitorPlayerName).toBe("Charlie");
    expect(result.pairings[1].visitorPlayerName).toBe("Blind");
  });

  it("returns game results with winners", async () => {
    const db = makeDb(baseData);
    const result = await getMatchDetailHandler(
      { db: db as any },
      { matchId: "match-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );
    expect(result.games).toHaveLength(2);
    expect(result.games[0].winner).toBe("home");
    expect(result.games[0].slot).toBe(1);
  });

  it("returns match totals and bonus winner", async () => {
    const db = makeDb(baseData);
    const result = await getMatchDetailHandler(
      { db: db as any },
      { matchId: "match-1" as any, leagueId: "league-1" as any, userId: "user-1" as any },
    );
    expect(result.match.totals?.homePlus).toBe(45);
    expect(result.match.totals?.visitorPlus).toBe(38);
    expect(result.match.totals?.bonusWinner).toBe("home");
  });

  it("throws when match not found in league", async () => {
    const db = makeDb(baseData);
    await expect(
      getMatchDetailHandler(
        { db: db as any },
        { matchId: "nonexistent" as any, leagueId: "league-1" as any, userId: "user-1" as any },
      ),
    ).rejects.toThrow(/not found/i);
  });
});
