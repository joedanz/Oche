// ABOUTME: Tests for the historical trends backend queries.
// ABOUTME: Validates player average trends and team points trends over matches.

import { describe, it, expect, vi } from "vitest";
import {
  getTrendsMetadataHandler,
  getPlayerTrendHandler,
  getTeamTrendHandler,
} from "./trends";

function createMockDb(data: {
  players?: any[];
  users?: any[];
  teams?: any[];
  seasons?: any[];
  matches?: any[];
  games?: any[];
  innings?: any[];
  leagueMemberships?: any[];
  leagues?: any[];
}) {
  const tables: Record<string, any[]> = {
    players: data.players ?? [],
    users: data.users ?? [],
    teams: data.teams ?? [],
    seasons: data.seasons ?? [],
    matches: data.matches ?? [],
    games: data.games ?? [],
    innings: data.innings ?? [],
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
const teamId = "team1" as any;
const playerId = "player1" as any;

const defaultMembership = { _id: "mem1", userId, leagueId, role: "player" };
const defaultSeason = { _id: seasonId, leagueId, name: "Spring 2026", isActive: true };
const defaultLeague = {
  _id: leagueId,
  name: "Test League",
  matchConfig: { pointsPerGameWin: 1, bonusForTotal: false },
};

describe("getTrendsMetadataHandler", () => {
  it("returns players, teams, and seasons for a league", async () => {
    const db = createMockDb({
      teams: [{ _id: teamId, name: "Alpha", leagueId }],
      players: [{ _id: playerId, userId: "u1", teamId, status: "active" }],
      users: [{ _id: "u1", name: "Alice", email: "alice@test.com" }],
      seasons: [defaultSeason],
      leagueMemberships: [defaultMembership],
    });

    const result = await getTrendsMetadataHandler({ db: db as any }, { leagueId, userId });

    expect(result.players).toHaveLength(1);
    expect(result.players[0].name).toBe("Alice");
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].name).toBe("Alpha");
    expect(result.seasons).toHaveLength(1);
  });
});

describe("getPlayerTrendHandler", () => {
  it("returns cumulative averages over matches sorted by date", async () => {
    const match1 = { _id: "m1", leagueId, seasonId, date: "2026-01-01", homeTeamId: teamId, visitorTeamId: "t2" };
    const match2 = { _id: "m2", leagueId, seasonId, date: "2026-01-08", homeTeamId: teamId, visitorTeamId: "t2" };

    const game1 = { _id: "g1", matchId: "m1", homePlayerId: playerId, visitorPlayerId: "p2", slot: 1 };
    const game2 = { _id: "g2", matchId: "m2", homePlayerId: playerId, visitorPlayerId: "p2", slot: 1 };

    // Match 1: player scores 36 runs over 9 innings (avg 4.0 per inning, 36 total)
    const innings1 = Array.from({ length: 9 }, (_, i) => ({
      _id: `inn1-${i}`,
      gameId: "g1",
      inningNumber: i + 1,
      batter: "home",
      runs: 4,
      isExtra: false,
    }));

    // Match 2: player scores 54 runs over 9 innings (avg 6.0 per inning, 54 total)
    const innings2 = Array.from({ length: 9 }, (_, i) => ({
      _id: `inn2-${i}`,
      gameId: "g2",
      inningNumber: i + 1,
      batter: "home",
      runs: 6,
      isExtra: false,
    }));

    const db = createMockDb({
      players: [{ _id: playerId, userId: "u1", teamId }],
      users: [{ _id: "u1", name: "Alice" }],
      teams: [{ _id: teamId, name: "Alpha", leagueId }],
      seasons: [defaultSeason],
      matches: [match1, match2],
      games: [game1, game2],
      innings: [...innings1, ...innings2],
      leagueMemberships: [defaultMembership],
    });

    const result = await getPlayerTrendHandler({ db: db as any }, { playerId, leagueId, userId, seasonId });

    expect(result.playerName).toBe("Alice");
    expect(result.points).toHaveLength(2);
    // Match 1: avg = 36/1 = 36, cumAvg = 36/1 = 36
    expect(result.points[0].matchDate).toBe("2026-01-01");
    expect(result.points[0].average).toBe(36);
    expect(result.points[0].cumulativeAverage).toBe(36);
    // Match 2: avg = 54/1 = 54, cumAvg = (36+54)/2 = 45
    expect(result.points[1].matchDate).toBe("2026-01-08");
    expect(result.points[1].average).toBe(54);
    expect(result.points[1].cumulativeAverage).toBe(45);
  });

  it("returns empty points when no season found", async () => {
    const db = createMockDb({
      players: [{ _id: playerId, userId: "u1", teamId }],
      users: [{ _id: "u1", name: "Alice" }],
      seasons: [],
      leagueMemberships: [defaultMembership],
    });

    const result = await getPlayerTrendHandler({ db: db as any }, { playerId, leagueId, userId });

    expect(result.points).toEqual([]);
  });

  it("skips matches where player did not play", async () => {
    const match1 = { _id: "m1", leagueId, seasonId, date: "2026-01-01", homeTeamId: teamId, visitorTeamId: "t2" };
    const game1 = { _id: "g1", matchId: "m1", homePlayerId: "other-player", visitorPlayerId: "p2", slot: 1 };

    const db = createMockDb({
      players: [{ _id: playerId, userId: "u1", teamId }],
      users: [{ _id: "u1", name: "Alice" }],
      seasons: [defaultSeason],
      matches: [match1],
      games: [game1],
      innings: [],
      leagueMemberships: [defaultMembership],
    });

    const result = await getPlayerTrendHandler({ db: db as any }, { playerId, leagueId, userId, seasonId });

    expect(result.points).toEqual([]);
  });
});

describe("getTeamTrendHandler", () => {
  it("returns cumulative match points over time", async () => {
    const match1 = { _id: "m1", leagueId, seasonId, date: "2026-01-01", homeTeamId: teamId, visitorTeamId: "t2" };
    const match2 = { _id: "m2", leagueId, seasonId, date: "2026-01-08", homeTeamId: teamId, visitorTeamId: "t2" };

    // Match 1: team wins 2 games
    const games1 = [
      { _id: "g1a", matchId: "m1", winner: "home", homePlayerId: "p1", visitorPlayerId: "p2", slot: 1 },
      { _id: "g1b", matchId: "m1", winner: "home", homePlayerId: "p3", visitorPlayerId: "p4", slot: 2 },
    ];
    // Match 2: team wins 1 game
    const games2 = [
      { _id: "g2a", matchId: "m2", winner: "home", homePlayerId: "p1", visitorPlayerId: "p2", slot: 1 },
      { _id: "g2b", matchId: "m2", winner: "visitor", homePlayerId: "p3", visitorPlayerId: "p4", slot: 2 },
    ];

    const db = createMockDb({
      teams: [{ _id: teamId, name: "Alpha", leagueId }],
      seasons: [defaultSeason],
      matches: [match1, match2],
      games: [...games1, ...games2],
      leagues: [defaultLeague],
      leagueMemberships: [defaultMembership],
    });

    const result = await getTeamTrendHandler({ db: db as any }, { teamId, leagueId, userId, seasonId });

    expect(result.teamName).toBe("Alpha");
    expect(result.points).toHaveLength(2);
    expect(result.points[0].matchPoints).toBe(2);
    expect(result.points[0].cumulativePoints).toBe(2);
    expect(result.points[1].matchPoints).toBe(1);
    expect(result.points[1].cumulativePoints).toBe(3);
  });

  it("returns empty when no season", async () => {
    const db = createMockDb({
      teams: [{ _id: teamId, name: "Alpha", leagueId }],
      seasons: [],
      leagues: [defaultLeague],
      leagueMemberships: [defaultMembership],
    });

    const result = await getTeamTrendHandler({ db: db as any }, { teamId, leagueId, userId });

    expect(result.points).toEqual([]);
  });
});
