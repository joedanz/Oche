// ABOUTME: Tests for the league standings backend query.
// ABOUTME: Validates ranking, sorting by match points, tiebreakers, and division/season filtering.

import { describe, it, expect, vi } from "vitest";
import { getStandingsHandler, type StandingsEntry } from "./standings";

function createMockDb(data: {
  teams?: any[];
  divisions?: any[];
  seasons?: any[];
  matches?: any[];
  games?: any[];
  innings?: any[];
  leagueMemberships?: any[];
  leagues?: any[];
}) {
  const tables: Record<string, any[]> = {
    teams: data.teams ?? [],
    divisions: data.divisions ?? [],
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

const defaultLeague = {
  _id: leagueId,
  name: "Test League",
  matchConfig: {
    gamesPerMatch: 5,
    pointsPerGameWin: 1,
    bonusForTotal: true,
    extraExclude: true,
    blindRules: { enabled: false, defaultRuns: 0 },
  },
};
const defaultMembership = { _id: "mem1", userId, leagueId, role: "player" };
const defaultSeason = { _id: seasonId, leagueId, name: "Spring 2026", isActive: true };

describe("getStandingsHandler", () => {
  it("returns standings sorted by match points descending", async () => {
    const db = createMockDb({
      teams: [
        { _id: "t1", name: "Alpha", leagueId },
        { _id: "t2", name: "Beta", leagueId },
        { _id: "t3", name: "Gamma", leagueId },
      ],
      seasons: [defaultSeason],
      matches: [
        {
          _id: "m1", leagueId, seasonId,
          homeTeamId: "t1", visitorTeamId: "t2",
          date: "2026-03-01", status: "completed", pairings: [],
          totals: { homePlus: 50, visitorPlus: 40, bonusWinner: "home" },
        },
        {
          _id: "m2", leagueId, seasonId,
          homeTeamId: "t3", visitorTeamId: "t1",
          date: "2026-03-08", status: "completed", pairings: [],
        },
      ],
      games: [
        // Match 1: Alpha wins 3 games, Beta wins 1
        { _id: "g1", matchId: "m1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" },
        { _id: "g2", matchId: "m1", slot: 2, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" },
        { _id: "g3", matchId: "m1", slot: 3, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" },
        { _id: "g4", matchId: "m1", slot: 4, homePlayerId: "p1", visitorPlayerId: "p2", winner: "visitor" },
        // Match 2: Gamma wins 2, Alpha wins 1
        { _id: "g5", matchId: "m2", slot: 1, homePlayerId: "p3", visitorPlayerId: "p1", winner: "home" },
        { _id: "g6", matchId: "m2", slot: 2, homePlayerId: "p3", visitorPlayerId: "p1", winner: "home" },
        { _id: "g7", matchId: "m2", slot: 3, homePlayerId: "p3", visitorPlayerId: "p1", winner: "visitor" },
      ],
      innings: [],
      leagueMemberships: [defaultMembership],
      leagues: [defaultLeague],
    });

    const result = await getStandingsHandler({ db: db as any }, { leagueId, userId, seasonId });

    expect(result.standings).toHaveLength(3);
    // Alpha: 3+1(bonus)+1 = 5 pts, Gamma: 2 pts, Beta: 1 pt
    expect(result.standings[0].teamName).toBe("Alpha");
    expect(result.standings[0].matchPoints).toBe(5);
    expect(result.standings[1].teamName).toBe("Gamma");
    expect(result.standings[1].matchPoints).toBe(2);
    expect(result.standings[2].teamName).toBe("Beta");
    expect(result.standings[2].matchPoints).toBe(1);
  });

  it("uses total runs scored as first tiebreaker", async () => {
    const db = createMockDb({
      teams: [
        { _id: "t1", name: "Alpha", leagueId },
        { _id: "t2", name: "Beta", leagueId },
      ],
      seasons: [defaultSeason],
      matches: [
        {
          _id: "m1", leagueId, seasonId,
          homeTeamId: "t1", visitorTeamId: "t2",
          date: "2026-03-01", status: "completed", pairings: [],
        },
      ],
      games: [
        { _id: "g1", matchId: "m1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p2", winner: "home" },
        { _id: "g2", matchId: "m1", slot: 2, homePlayerId: "p1", visitorPlayerId: "p2", winner: "visitor" },
      ],
      innings: [
        // Alpha scores 30, Beta scores 20
        { _id: "i1", gameId: "g1", inningNumber: 1, batter: "home", runs: 9, isExtra: false },
        { _id: "i2", gameId: "g1", inningNumber: 2, batter: "home", runs: 9, isExtra: false },
        { _id: "i3", gameId: "g1", inningNumber: 3, batter: "home", runs: 9, isExtra: false },
        { _id: "i4", gameId: "g1", inningNumber: 1, batter: "visitor", runs: 5, isExtra: false },
        { _id: "i5", gameId: "g1", inningNumber: 2, batter: "visitor", runs: 5, isExtra: false },
        { _id: "i6", gameId: "g2", inningNumber: 1, batter: "home", runs: 3, isExtra: false },
        { _id: "i7", gameId: "g2", inningNumber: 1, batter: "visitor", runs: 5, isExtra: false },
        { _id: "i8", gameId: "g2", inningNumber: 2, batter: "visitor", runs: 5, isExtra: false },
      ],
      leagueMemberships: [defaultMembership],
      leagues: [{ ...defaultLeague, matchConfig: { ...defaultLeague.matchConfig, bonusForTotal: false } }],
    });

    const result = await getStandingsHandler({ db: db as any }, { leagueId, userId, seasonId });

    // Both have 1 game win = 1 match point. Alpha scores more runs → ranks first.
    expect(result.standings[0].teamName).toBe("Alpha");
    expect(result.standings[1].teamName).toBe("Beta");
  });

  it("filters by division when divisionId provided", async () => {
    const db = createMockDb({
      teams: [
        { _id: "t1", name: "Alpha", leagueId, divisionId: "div1" },
        { _id: "t2", name: "Beta", leagueId, divisionId: "div2" },
        { _id: "t3", name: "Gamma", leagueId, divisionId: "div1" },
      ],
      divisions: [
        { _id: "div1", leagueId, name: "East" },
        { _id: "div2", leagueId, name: "West" },
      ],
      seasons: [defaultSeason],
      matches: [],
      games: [],
      innings: [],
      leagueMemberships: [defaultMembership],
      leagues: [defaultLeague],
    });

    const result = await getStandingsHandler({ db: db as any }, {
      leagueId, userId, seasonId, divisionId: "div1" as any,
    });

    expect(result.standings).toHaveLength(2);
    const names = result.standings.map((s: StandingsEntry) => s.teamName);
    expect(names).toContain("Alpha");
    expect(names).toContain("Gamma");
    expect(names).not.toContain("Beta");
  });

  it("returns empty standings when no season found", async () => {
    const db = createMockDb({
      teams: [{ _id: "t1", name: "Alpha", leagueId }],
      seasons: [],
      matches: [],
      games: [],
      innings: [],
      leagueMemberships: [defaultMembership],
      leagues: [defaultLeague],
    });

    const result = await getStandingsHandler({ db: db as any }, { leagueId, userId });

    expect(result.standings).toEqual([]);
  });

  it("assigns correct rank numbers", async () => {
    const db = createMockDb({
      teams: [
        { _id: "t1", name: "Alpha", leagueId },
        { _id: "t2", name: "Beta", leagueId },
      ],
      seasons: [defaultSeason],
      matches: [],
      games: [],
      innings: [],
      leagueMemberships: [defaultMembership],
      leagues: [defaultLeague],
    });

    const result = await getStandingsHandler({ db: db as any }, { leagueId, userId, seasonId });

    expect(result.standings[0].rank).toBe(1);
    expect(result.standings[1].rank).toBe(2);
  });
});
