// ABOUTME: Tests for player statistics calculation logic.
// ABOUTME: Verifies stat computation from games and innings data.

import { describe, it, expect } from "vitest";
import {
  calculatePlayerStats,
  type GameData,
} from "./playerStats";

function makeGame(overrides: Partial<GameData> & { homeRuns?: number[]; visitorRuns?: number[]; extraHomeRuns?: number[]; extraVisitorRuns?: number[] }): GameData {
  const homeRuns = overrides.homeRuns ?? [5, 5, 5, 5, 5, 5, 5, 5, 5];
  const visitorRuns = overrides.visitorRuns ?? [3, 3, 3, 3, 3, 3, 3, 3, 3];
  const extraHomeRuns = overrides.extraHomeRuns ?? [];
  const extraVisitorRuns = overrides.extraVisitorRuns ?? [];

  const innings = [
    ...homeRuns.map((runs, i) => ({ inningNumber: i + 1, batter: "home" as const, runs, isExtra: false })),
    ...visitorRuns.map((runs, i) => ({ inningNumber: i + 1, batter: "visitor" as const, runs, isExtra: false })),
    ...extraHomeRuns.map((runs, i) => ({ inningNumber: 10 + i, batter: "home" as const, runs, isExtra: true })),
    ...extraVisitorRuns.map((runs, i) => ({ inningNumber: 10 + i, batter: "visitor" as const, runs, isExtra: true })),
  ];

  return {
    gameId: overrides.gameId ?? "game-1",
    homePlayerId: overrides.homePlayerId ?? "player-home",
    visitorPlayerId: overrides.visitorPlayerId ?? "player-visitor",
    winner: overrides.winner ?? "home",
    isDnp: overrides.isDnp ?? false,
    innings,
  };
}

describe("calculatePlayerStats", () => {
  const playerId = "player-home";

  it("calculates basic stats for a single game as home player", () => {
    const games = [makeGame({
      homeRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // plus = 45
      visitorRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3], // minus = 27
      winner: "home",
    })];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.gamesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.totalPlus).toBe(45);
    expect(stats.totalMinus).toBe(27);
    expect(stats.highInnings).toBe(0);
  });

  it("calculates stats for visitor player", () => {
    const visitorId = "player-visitor";
    const games = [makeGame({
      homeRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3], // opponent: 27
      visitorRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // own: 45
      winner: "visitor",
    })];

    const stats = calculatePlayerStats(visitorId, games);

    expect(stats.gamesPlayed).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.totalPlus).toBe(45);
    expect(stats.totalMinus).toBe(27);
  });

  it("excludes extra innings from plus/minus calculations", () => {
    const games = [makeGame({
      homeRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // regulation: 45
      visitorRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // regulation: 45
      extraHomeRuns: [9], // extra: excluded
      extraVisitorRuns: [3], // extra: excluded
      winner: "home",
    })];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.totalPlus).toBe(45);
    expect(stats.totalMinus).toBe(45);
  });

  it("counts high innings (9-run regular innings only)", () => {
    const games = [makeGame({
      homeRuns: [9, 9, 5, 5, 5, 5, 5, 5, 9], // three 9s
      visitorRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      extraHomeRuns: [9], // extra 9 should NOT count
      extraVisitorRuns: [3],
      winner: "home",
    })];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.highInnings).toBe(3);
  });

  it("skips DNP games", () => {
    const games = [
      makeGame({ gameId: "g1", winner: "home" }),
      makeGame({ gameId: "g2", isDnp: true, winner: undefined }),
    ];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.gamesPlayed).toBe(1);
  });

  it("accumulates stats across multiple games", () => {
    const games = [
      makeGame({
        gameId: "g1",
        homeRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // plus=45
        visitorRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3], // minus=27
        winner: "home",
      }),
      makeGame({
        gameId: "g2",
        homeRuns: [2, 2, 2, 2, 2, 2, 2, 2, 2], // plus=18
        visitorRuns: [4, 4, 4, 4, 4, 4, 4, 4, 4], // minus=36
        winner: "visitor",
      }),
    ];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.gamesPlayed).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.totalPlus).toBe(63); // 45 + 18
    expect(stats.totalMinus).toBe(63); // 27 + 36
  });

  it("handles tie games (not a win or loss)", () => {
    const games = [makeGame({
      homeRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5],
      visitorRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5],
      winner: "tie",
    })];

    const stats = calculatePlayerStats(playerId, games);

    expect(stats.gamesPlayed).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
  });

  it("returns zeros for no games", () => {
    const stats = calculatePlayerStats(playerId, []);

    expect(stats.gamesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.totalPlus).toBe(0);
    expect(stats.totalMinus).toBe(0);
    expect(stats.highInnings).toBe(0);
  });

  it("computes average correctly", () => {
    const games = [
      makeGame({
        gameId: "g1",
        homeRuns: [5, 5, 5, 5, 5, 5, 5, 5, 5], // 45
        visitorRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3],
        winner: "home",
      }),
      makeGame({
        gameId: "g2",
        homeRuns: [3, 3, 3, 3, 3, 3, 3, 3, 3], // 27
        visitorRuns: [4, 4, 4, 4, 4, 4, 4, 4, 4],
        winner: "visitor",
      }),
    ];

    const stats = calculatePlayerStats(playerId, games);

    // Average = totalPlus / gamesPlayed = (45+27) / 2 = 36
    expect(stats.totalPlus / stats.gamesPlayed).toBe(36);
  });
});
