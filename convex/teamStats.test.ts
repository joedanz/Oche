// ABOUTME: Tests for the team statistics backend queries.
// ABOUTME: Validates team stats aggregation including game wins, runs, match points, and roster stats.

import { describe, it, expect, vi } from "vitest";
import { getTeamStatsHandler } from "./teamStats";

// Minimal mock DB (same pattern as playerStatsPage.test.ts)
function createMockDb(data: {
  teams?: any[];
  players?: any[];
  users?: any[];
  seasons?: any[];
  matches?: any[];
  games?: any[];
  innings?: any[];
  playerStats?: any[];
  leagueMemberships?: any[];
  leagues?: any[];
}) {
  const tables: Record<string, any[]> = {
    teams: data.teams ?? [],
    players: data.players ?? [],
    users: data.users ?? [],
    seasons: data.seasons ?? [],
    matches: data.matches ?? [],
    games: data.games ?? [],
    innings: data.innings ?? [],
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
const teamId = "team1" as any;
const userId = "user1" as any;

describe("getTeamStatsHandler", () => {
  it("returns team info and empty stats when no matches played", async () => {
    const db = createMockDb({
      teams: [{ _id: teamId, name: "Team Alpha", leagueId, venue: "Bar A" }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      matches: [],
      games: [],
      players: [],
      users: [],
      playerStats: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      leagues: [{ _id: leagueId, name: "Test League", matchConfig: { gamesPerMatch: 5, pointsPerGameWin: 1, bonusForTotal: true, extraExclude: true, blindRules: { enabled: false, defaultRuns: 0 } } }],
    });

    const result = await getTeamStatsHandler({ db: db as any }, {
      teamId, leagueId, userId, seasonId,
    });

    expect(result.teamName).toBe("Team Alpha");
    expect(result.gameWins).toBe(0);
    expect(result.totalRunsScored).toBe(0);
    expect(result.totalRunsAllowed).toBe(0);
    expect(result.matchPoints).toBe(0);
    expect(result.teamPlusMinus).toBe(0);
    expect(result.roster).toEqual([]);
  });

  it("computes game wins and match points from completed matches", async () => {
    const matchId = "match1" as any;
    const player1 = "p1" as any;
    const player2 = "p2" as any;

    const db = createMockDb({
      teams: [
        { _id: teamId, name: "Team Alpha", leagueId },
        { _id: "team2", name: "Team Beta", leagueId },
      ],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      matches: [{
        _id: matchId, leagueId, seasonId,
        homeTeamId: teamId, visitorTeamId: "team2",
        date: "2026-03-15", status: "completed", pairings: [],
        totals: { homePlus: 50, visitorPlus: 40, bonusWinner: "home" },
      }],
      games: [
        { _id: "g1", matchId, slot: 1, homePlayerId: player1, visitorPlayerId: player2, winner: "home" },
        { _id: "g2", matchId, slot: 2, homePlayerId: player1, visitorPlayerId: player2, winner: "home" },
        { _id: "g3", matchId, slot: 3, homePlayerId: player1, visitorPlayerId: player2, winner: "visitor" },
      ],
      innings: [
        // Game 1: home=20, visitor=15
        { _id: "i1", gameId: "g1", inningNumber: 1, batter: "home", runs: 5, isExtra: false },
        { _id: "i2", gameId: "g1", inningNumber: 2, batter: "home", runs: 5, isExtra: false },
        { _id: "i3", gameId: "g1", inningNumber: 3, batter: "home", runs: 5, isExtra: false },
        { _id: "i4", gameId: "g1", inningNumber: 4, batter: "home", runs: 5, isExtra: false },
        { _id: "i5", gameId: "g1", inningNumber: 1, batter: "visitor", runs: 5, isExtra: false },
        { _id: "i6", gameId: "g1", inningNumber: 2, batter: "visitor", runs: 5, isExtra: false },
        { _id: "i7", gameId: "g1", inningNumber: 3, batter: "visitor", runs: 5, isExtra: false },
      ],
      players: [
        { _id: player1, userId: "u1", teamId, status: "active" },
      ],
      users: [{ _id: "u1", name: "Alice", email: "a@test.com" }],
      playerStats: [{
        _id: "ps1", playerId: player1, seasonId,
        gamesPlayed: 3, wins: 2, losses: 1, totalPlus: 60, totalMinus: 40, highInnings: 1,
      }],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      leagues: [{ _id: leagueId, name: "Test League", matchConfig: { gamesPerMatch: 3, pointsPerGameWin: 1, bonusForTotal: true, extraExclude: true, blindRules: { enabled: false, defaultRuns: 0 } } }],
    });

    const result = await getTeamStatsHandler({ db: db as any }, {
      teamId, leagueId, userId, seasonId,
    });

    expect(result.gameWins).toBe(2); // 2 games won by home
    expect(result.matchPoints).toBe(3); // 2 game wins * 1 point + 1 bonus
    expect(result.totalRunsScored).toBeGreaterThan(0);
  });

  it("includes roster with per-player stats summary", async () => {
    const player1 = "p1" as any;
    const player2 = "p2" as any;

    const db = createMockDb({
      teams: [{ _id: teamId, name: "Team Alpha", leagueId }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      matches: [],
      games: [],
      innings: [],
      players: [
        { _id: player1, userId: "u1", teamId, status: "active" },
        { _id: player2, userId: "u2", teamId, status: "active" },
      ],
      users: [
        { _id: "u1", name: "Alice", email: "a@test.com" },
        { _id: "u2", name: "Bob", email: "b@test.com" },
      ],
      playerStats: [
        { _id: "ps1", playerId: player1, seasonId, gamesPlayed: 5, wins: 3, losses: 2, totalPlus: 150, totalMinus: 100, highInnings: 2 },
        { _id: "ps2", playerId: player2, seasonId, gamesPlayed: 4, wins: 1, losses: 3, totalPlus: 100, totalMinus: 120, highInnings: 0 },
      ],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      leagues: [{ _id: leagueId, name: "Test League", matchConfig: { gamesPerMatch: 5, pointsPerGameWin: 1, bonusForTotal: true, extraExclude: true, blindRules: { enabled: false, defaultRuns: 0 } } }],
    });

    const result = await getTeamStatsHandler({ db: db as any }, {
      teamId, leagueId, userId, seasonId,
    });

    expect(result.roster).toHaveLength(2);
    const alice = result.roster.find((p: any) => p.name === "Alice");
    expect(alice).toBeDefined();
    expect(alice!.gamesPlayed).toBe(5);
    expect(alice!.wins).toBe(3);
    expect(alice!.average).toBeCloseTo(30); // 150 / 5
  });

  it("excludes extra innings from team runs totals", async () => {
    const matchId = "match1" as any;
    const db = createMockDb({
      teams: [
        { _id: teamId, name: "Team Alpha", leagueId },
        { _id: "team2", name: "Team Beta", leagueId },
      ],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      matches: [{
        _id: matchId, leagueId, seasonId,
        homeTeamId: teamId, visitorTeamId: "team2",
        date: "2026-03-15", status: "completed", pairings: [],
      }],
      games: [
        { _id: "g1", matchId, slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" },
      ],
      innings: [
        { _id: "i1", gameId: "g1", inningNumber: 1, batter: "home", runs: 5, isExtra: false },
        { _id: "i2", gameId: "g1", inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
        { _id: "i3", gameId: "g1", inningNumber: 10, batter: "home", runs: 7, isExtra: true },
        { _id: "i4", gameId: "g1", inningNumber: 10, batter: "visitor", runs: 2, isExtra: true },
      ],
      players: [],
      users: [],
      playerStats: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      leagues: [{ _id: leagueId, name: "Test League", matchConfig: { gamesPerMatch: 5, pointsPerGameWin: 1, bonusForTotal: true, extraExclude: true, blindRules: { enabled: false, defaultRuns: 0 } } }],
    });

    const result = await getTeamStatsHandler({ db: db as any }, {
      teamId, leagueId, userId, seasonId,
    });

    expect(result.totalRunsScored).toBe(5); // only regular
    expect(result.totalRunsAllowed).toBe(3); // only regular
  });

  it("skips DNP games in team stats", async () => {
    const matchId = "match1" as any;
    const db = createMockDb({
      teams: [
        { _id: teamId, name: "Team Alpha", leagueId },
        { _id: "team2", name: "Team Beta", leagueId },
      ],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      matches: [{
        _id: matchId, leagueId, seasonId,
        homeTeamId: teamId, visitorTeamId: "team2",
        date: "2026-03-15", status: "completed", pairings: [],
      }],
      games: [
        { _id: "g1", matchId, slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", winner: undefined, isDnp: true },
      ],
      innings: [],
      players: [],
      users: [],
      playerStats: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
      leagues: [{ _id: leagueId, name: "Test League", matchConfig: { gamesPerMatch: 5, pointsPerGameWin: 1, bonusForTotal: true, extraExclude: true, blindRules: { enabled: false, defaultRuns: 0 } } }],
    });

    const result = await getTeamStatsHandler({ db: db as any }, {
      teamId, leagueId, userId, seasonId,
    });

    expect(result.gameWins).toBe(0);
    expect(result.totalRunsScored).toBe(0);
  });
});
