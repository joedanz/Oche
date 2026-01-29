// ABOUTME: Tests for the player stats page backend queries.
// ABOUTME: Validates player page data retrieval including stats, game history, and seasons.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlayerPageDataHandler } from "./playerStatsPage";

// Minimal mock DB
function createMockDb(data: {
  players?: any[];
  users?: any[];
  teams?: any[];
  seasons?: any[];
  playerStats?: any[];
  matches?: any[];
  games?: any[];
  innings?: any[];
  leagueMemberships?: any[];
}) {
  const tables: Record<string, any[]> = {
    players: data.players ?? [],
    users: data.users ?? [],
    teams: data.teams ?? [],
    seasons: data.seasons ?? [],
    playerStats: data.playerStats ?? [],
    matches: data.matches ?? [],
    games: data.games ?? [],
    innings: data.innings ?? [],
    leagueMemberships: data.leagueMemberships ?? [],
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
          const q = {
            eq: (a: any, b: any) => a === b,
            field: (name: string) => (row: any) => row[name],
            and: (...args: boolean[]) => args.every(Boolean),
          };
          // Custom filter: apply fn with each row
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
        unique: async () => (rows.length === 1 ? rows[0] : null),
      };
    }),
  };
  return db;
}

const leagueId = "league1" as any;
const seasonId = "season1" as any;
const playerId = "player1" as any;
const userId = "user1" as any;
const teamId = "team1" as any;

describe("getPlayerPageDataHandler", () => {
  it("returns player info, stats, and empty game history when no games played", async () => {
    const db = createMockDb({
      players: [{ _id: playerId, userId, teamId, status: "active" }],
      users: [{ _id: userId, name: "Alice", email: "alice@test.com" }],
      teams: [{ _id: teamId, name: "Team Alpha", leagueId }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      playerStats: [],
      matches: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
    });

    const result = await getPlayerPageDataHandler({ db: db as any }, {
      playerId, seasonId, leagueId, userId,
    });

    expect(result.playerName).toBe("Alice");
    expect(result.teamName).toBe("Team Alpha");
    expect(result.stats).toBeNull();
    expect(result.gameHistory).toEqual([]);
    expect(result.seasons).toHaveLength(1);
    expect(result.seasons[0].name).toBe("Spring 2026");
  });

  it("returns computed stats with average when player has stats", async () => {
    const db = createMockDb({
      players: [{ _id: playerId, userId, teamId, status: "active" }],
      users: [{ _id: userId, name: "Alice", email: "alice@test.com" }],
      teams: [{ _id: teamId, name: "Team Alpha", leagueId }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      playerStats: [{
        _id: "stats1",
        playerId,
        seasonId,
        gamesPlayed: 4,
        wins: 3,
        losses: 1,
        totalPlus: 120,
        totalMinus: 80,
        highInnings: 2,
      }],
      matches: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
    });

    const result = await getPlayerPageDataHandler({ db: db as any }, {
      playerId, seasonId, leagueId, userId,
    });

    expect(result.stats).not.toBeNull();
    expect(result.stats!.gamesPlayed).toBe(4);
    expect(result.stats!.wins).toBe(3);
    expect(result.stats!.average).toBe(30); // 120 / 4
    expect(result.stats!.totalPlus).toBe(120);
    expect(result.stats!.totalMinus).toBe(80);
  });

  it("returns game-by-game history with opponent names and scores", async () => {
    const oppPlayerId = "player2" as any;
    const oppUserId = "user2" as any;
    const matchId = "match1" as any;
    const gameId = "game1" as any;

    const db = createMockDb({
      players: [
        { _id: playerId, userId, teamId, status: "active" },
        { _id: oppPlayerId, userId: oppUserId, teamId: "team2", status: "active" },
      ],
      users: [
        { _id: userId, name: "Alice", email: "alice@test.com" },
        { _id: oppUserId, name: "Bob", email: "bob@test.com" },
      ],
      teams: [
        { _id: teamId, name: "Team Alpha", leagueId },
        { _id: "team2", name: "Team Beta", leagueId },
      ],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      playerStats: [],
      matches: [{ _id: matchId, leagueId, seasonId, homeTeamId: teamId, visitorTeamId: "team2", date: "2026-03-15", status: "completed", pairings: [] }],
      games: [{ _id: gameId, matchId, slot: 1, homePlayerId: playerId, visitorPlayerId: oppPlayerId, winner: "home" }],
      innings: [
        { _id: "i1", gameId, inningNumber: 1, batter: "home", runs: 5, isExtra: false },
        { _id: "i2", gameId, inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
        { _id: "i3", gameId, inningNumber: 2, batter: "home", runs: 9, isExtra: false },
        { _id: "i4", gameId, inningNumber: 2, batter: "visitor", runs: 4, isExtra: false },
      ],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
    });

    const result = await getPlayerPageDataHandler({ db: db as any }, {
      playerId, seasonId, leagueId, userId,
    });

    expect(result.gameHistory).toHaveLength(1);
    const entry = result.gameHistory[0];
    expect(entry.opponentName).toBe("Bob");
    expect(entry.plus).toBe(14); // 5 + 9
    expect(entry.minus).toBe(7); // 3 + 4
    expect(entry.total).toBe(7); // 14 - 7
    expect(entry.highInnings).toBe(1); // one 9-run inning
    expect(entry.result).toBe("win");
    expect(entry.matchDate).toBe("2026-03-15");
  });

  it("excludes extra innings from game history calculations", async () => {
    const oppPlayerId = "player2" as any;
    const matchId = "match1" as any;
    const gameId = "game1" as any;

    const db = createMockDb({
      players: [
        { _id: playerId, userId, teamId, status: "active" },
        { _id: oppPlayerId, userId: "user2", teamId: "team2", status: "active" },
      ],
      users: [
        { _id: userId, name: "Alice", email: "alice@test.com" },
        { _id: "user2", name: "Bob", email: "bob@test.com" },
      ],
      teams: [
        { _id: teamId, name: "Team Alpha", leagueId },
        { _id: "team2", name: "Team Beta", leagueId },
      ],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      playerStats: [],
      matches: [{ _id: matchId, leagueId, seasonId, homeTeamId: teamId, visitorTeamId: "team2", date: "2026-03-15", status: "completed", pairings: [] }],
      games: [{ _id: gameId, matchId, slot: 1, homePlayerId: playerId, visitorPlayerId: oppPlayerId, winner: "home" }],
      innings: [
        { _id: "i1", gameId, inningNumber: 1, batter: "home", runs: 5, isExtra: false },
        { _id: "i2", gameId, inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
        { _id: "i3", gameId, inningNumber: 10, batter: "home", runs: 7, isExtra: true },
        { _id: "i4", gameId, inningNumber: 10, batter: "visitor", runs: 2, isExtra: true },
      ],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
    });

    const result = await getPlayerPageDataHandler({ db: db as any }, {
      playerId, seasonId, leagueId, userId,
    });

    expect(result.gameHistory[0].plus).toBe(5); // only regular
    expect(result.gameHistory[0].minus).toBe(3); // only regular
  });

  it("skips DNP games in game history", async () => {
    const matchId = "match1" as any;

    const db = createMockDb({
      players: [{ _id: playerId, userId, teamId, status: "active" }],
      users: [{ _id: userId, name: "Alice", email: "alice@test.com" }],
      teams: [{ _id: teamId, name: "Team Alpha", leagueId }],
      seasons: [{ _id: seasonId, leagueId, name: "Spring 2026", isActive: true }],
      playerStats: [],
      matches: [{ _id: matchId, leagueId, seasonId, homeTeamId: teamId, visitorTeamId: "team2", date: "2026-03-15", status: "completed", pairings: [] }],
      games: [{ _id: "game1", matchId, slot: 1, homePlayerId: playerId, visitorPlayerId: "player2", winner: undefined, isDnp: true }],
      innings: [],
      leagueMemberships: [{ _id: "mem1", userId, leagueId, role: "player" }],
    });

    const result = await getPlayerPageDataHandler({ db: db as any }, {
      playerId, seasonId, leagueId, userId,
    });

    expect(result.gameHistory).toHaveLength(0);
  });
});
