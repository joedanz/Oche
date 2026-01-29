// ABOUTME: Tests for handicap scoring logic — spot runs calculation and application.
// ABOUTME: Covers pure computation, cascading override resolution, and winner adjustment.

import { describe, it, expect } from "vitest";
import { computeSpotRuns, resolveHandicapPercent, determineHandicappedWinner } from "./handicapScoring";

describe("computeSpotRuns", () => {
  it("returns spot runs for the lower-averaged player", () => {
    // Player A avg 5.0, Player B avg 3.0, 70% handicap
    // Difference = 2.0, spot = floor(2.0 * 70 / 100) = floor(1.4) = 1
    const result = computeSpotRuns(5.0, 3.0, 70);
    expect(result).toEqual({ spotRuns: 1, recipientSide: "visitor" });
  });

  it("returns 0 spot runs when averages are equal", () => {
    const result = computeSpotRuns(4.5, 4.5, 70);
    expect(result).toEqual({ spotRuns: 0, recipientSide: null });
  });

  it("gives spot runs to home when visitor has higher average", () => {
    const result = computeSpotRuns(3.0, 5.0, 100);
    // Difference = 2.0, spot = floor(2.0 * 100 / 100) = 2
    expect(result).toEqual({ spotRuns: 2, recipientSide: "home" });
  });

  it("floors the result", () => {
    // 5.5 - 3.2 = 2.3, 70% => floor(1.61) = 1
    const result = computeSpotRuns(5.5, 3.2, 70);
    expect(result).toEqual({ spotRuns: 1, recipientSide: "visitor" });
  });

  it("returns 0 when handicap percent is 0", () => {
    const result = computeSpotRuns(5.0, 3.0, 0);
    expect(result).toEqual({ spotRuns: 0, recipientSide: null });
  });
});

describe("resolveHandicapPercent", () => {
  it("uses game-level override when present", () => {
    expect(resolveHandicapPercent(70, 80, 90)).toBe(90);
  });

  it("uses match-level override when no game override", () => {
    expect(resolveHandicapPercent(70, 80, undefined)).toBe(80);
  });

  it("uses league default when no overrides", () => {
    expect(resolveHandicapPercent(70, undefined, undefined)).toBe(70);
  });
});

describe("determineHandicappedWinner", () => {
  it("gives victory to lower-averaged player when spot runs tip the balance", () => {
    // Home raw total = 30, Visitor raw total = 28, spot runs = 3 for visitor
    // Adjusted: home 30, visitor 28 + 3 = 31 → visitor wins
    const result = determineHandicappedWinner(30, 28, 3, "visitor");
    expect(result).toEqual({
      homeAdjusted: 30,
      visitorAdjusted: 31,
      winner: "visitor",
    });
  });

  it("preserves raw winner when spot runs are insufficient", () => {
    // Home raw = 35, Visitor raw = 28, spot runs = 2 for visitor
    // Adjusted: home 35, visitor 30 → home wins
    const result = determineHandicappedWinner(35, 28, 2, "visitor");
    expect(result).toEqual({
      homeAdjusted: 35,
      visitorAdjusted: 30,
      winner: "home",
    });
  });

  it("handles tie after adjustment", () => {
    const result = determineHandicappedWinner(30, 28, 2, "visitor");
    expect(result).toEqual({
      homeAdjusted: 30,
      visitorAdjusted: 30,
      winner: "tie",
    });
  });

  it("adds spot runs to home when home is the recipient", () => {
    const result = determineHandicappedWinner(25, 30, 6, "home");
    expect(result).toEqual({
      homeAdjusted: 31,
      visitorAdjusted: 30,
      winner: "home",
    });
  });

  it("handles no spot runs (null recipient)", () => {
    const result = determineHandicappedWinner(30, 25, 0, null);
    expect(result).toEqual({
      homeAdjusted: 30,
      visitorAdjusted: 25,
      winner: "home",
    });
  });
});
