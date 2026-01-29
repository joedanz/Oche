// ABOUTME: Tests for stats export utility functions (CSV and PDF generation).
// ABOUTME: Validates standings and player stats export formatting.

import { describe, it, expect } from "vitest";
import {
  standingsToCsv,
  playerStatsToCsv,
} from "./statsExport";

describe("standingsToCsv", () => {
  it("generates CSV with headers and data rows", () => {
    const standings = [
      { rank: 1, teamName: "Aces", matchPoints: 10, gameWins: 8, totalRunsScored: 200, plusMinus: 50 },
      { rank: 2, teamName: "Kings", matchPoints: 7, gameWins: 5, totalRunsScored: 150, plusMinus: -10 },
    ];
    const csv = standingsToCsv(standings, "Fall 2025", "Division A");
    expect(csv).toContain("Rank,Team,Match Points,Game Wins,Runs,+/-");
    expect(csv).toContain("1,Aces,10,8,200,50");
    expect(csv).toContain("2,Kings,7,5,150,-10");
  });

  it("includes season and division context", () => {
    const csv = standingsToCsv([], "Fall 2025", "Division A");
    expect(csv).toContain("Season: Fall 2025");
    expect(csv).toContain("Division: Division A");
  });

  it("handles empty standings", () => {
    const csv = standingsToCsv([], "Fall 2025", "All Divisions");
    expect(csv).toContain("Rank,Team,Match Points,Game Wins,Runs,+/-");
  });

  it("escapes commas in team names", () => {
    const standings = [
      { rank: 1, teamName: "Aces, Inc.", matchPoints: 10, gameWins: 8, totalRunsScored: 200, plusMinus: 50 },
    ];
    const csv = standingsToCsv(standings, "Fall 2025", "All");
    expect(csv).toContain('"Aces, Inc."');
  });
});

describe("playerStatsToCsv", () => {
  it("generates CSV with player stats headers and rows", () => {
    const stats = [
      { playerName: "Alice", teamName: "Aces", average: 5.5, totalPlus: 55, totalMinus: 30, plusMinus: 25, highInnings: 3, wins: 8, losses: 2, gamesPlayed: 10 },
      { playerName: "Bob", teamName: "Kings", average: 4.2, totalPlus: 42, totalMinus: 38, plusMinus: 4, highInnings: 1, wins: 5, losses: 5, gamesPlayed: 10 },
    ];
    const csv = playerStatsToCsv(stats, "Fall 2025");
    expect(csv).toContain("Player,Team,Average,Plus,Minus,+/-,High Innings,Wins,Losses,Games");
    expect(csv).toContain("Alice,Aces,5.5,55,30,25,3,8,2,10");
    expect(csv).toContain("Bob,Kings,4.2,42,38,4,1,5,5,10");
  });

  it("includes season context", () => {
    const csv = playerStatsToCsv([], "Fall 2025");
    expect(csv).toContain("Season: Fall 2025");
  });
});
