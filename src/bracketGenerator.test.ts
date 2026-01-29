// ABOUTME: Tests for pure bracket generation functions.
// ABOUTME: Validates seeding, byes, bracket structure for single-elimination tournaments.

import { describe, it, expect } from "vitest";
import {
  generateBracket,
  nextPowerOf2,
  type BracketParticipant,
} from "./bracketGenerator";

function makeParticipants(count: number): BracketParticipant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe("nextPowerOf2", () => {
  it("returns the next power of 2", () => {
    expect(nextPowerOf2(1)).toBe(1);
    expect(nextPowerOf2(2)).toBe(2);
    expect(nextPowerOf2(3)).toBe(4);
    expect(nextPowerOf2(5)).toBe(8);
    expect(nextPowerOf2(8)).toBe(8);
    expect(nextPowerOf2(9)).toBe(16);
  });
});

describe("generateBracket", () => {
  it("throws for fewer than 2 participants", () => {
    expect(() => generateBracket(makeParticipants(1))).toThrow(
      "Need at least 2 participants",
    );
    expect(() => generateBracket([])).toThrow("Need at least 2 participants");
  });

  it("generates correct bracket for 2 participants", () => {
    const bracket = generateBracket(makeParticipants(2));
    expect(bracket.rounds).toBe(1);
    expect(bracket.matches).toHaveLength(1);
    expect(bracket.matches[0].participant1?.seed).toBe(1);
    expect(bracket.matches[0].participant2?.seed).toBe(2);
    expect(bracket.matches[0].winnerId).toBeNull();
  });

  it("generates correct bracket for 4 participants", () => {
    const bracket = generateBracket(makeParticipants(4));
    expect(bracket.rounds).toBe(2);
    // 2 first-round matches + 1 final = 3
    expect(bracket.matches).toHaveLength(3);

    const firstRound = bracket.matches.filter((m) => m.round === 1);
    expect(firstRound).toHaveLength(2);
    // #1 vs #4 and #2 vs #3
    const seeds = firstRound.map((m) => [
      m.participant1?.seed,
      m.participant2?.seed,
    ]);
    expect(seeds).toContainEqual([1, 4]);
    expect(seeds).toContainEqual([2, 3]);
  });

  it("generates correct bracket for 8 participants", () => {
    const bracket = generateBracket(makeParticipants(8));
    expect(bracket.rounds).toBe(3);
    // 4 first-round + 2 semifinal + 1 final = 7
    expect(bracket.matches).toHaveLength(7);
  });

  it("assigns byes to highest seeds for non-power-of-2 counts", () => {
    const bracket = generateBracket(makeParticipants(3));
    expect(bracket.rounds).toBe(2);
    // bracket size = 4, so 2 first-round + 1 final = 3 matches
    expect(bracket.matches).toHaveLength(3);

    // Seed #1 should get the bye (auto-win)
    const byeMatch = bracket.matches.find(
      (m) => m.round === 1 && m.winnerId !== null,
    );
    expect(byeMatch).toBeDefined();
    expect(byeMatch!.winnerId).toBe("p1");
  });

  it("handles 5 participants with byes", () => {
    const bracket = generateBracket(makeParticipants(5));
    expect(bracket.rounds).toBe(3);
    // bracket size = 8: 4 first-round + 2 semi + 1 final = 7
    expect(bracket.matches).toHaveLength(7);

    // 3 byes: seeds 1, 2, 3 should auto-advance
    const byeMatches = bracket.matches.filter(
      (m) => m.round === 1 && m.winnerId !== null,
    );
    expect(byeMatches).toHaveLength(3);
  });

  it("subsequent rounds start empty", () => {
    const bracket = generateBracket(makeParticipants(4));
    const final = bracket.matches.find((m) => m.round === 2);
    expect(final).toBeDefined();
    expect(final!.participant1).toBeNull();
    expect(final!.participant2).toBeNull();
    expect(final!.winnerId).toBeNull();
  });
});
