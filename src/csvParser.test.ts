// ABOUTME: Tests for CSV parsing utilities.
// ABOUTME: Verifies CSV data is correctly parsed into structured score rows.

import { describe, it, expect } from "vitest";
import { parseCsvScores } from "./csvParser";

describe("parseCsvScores", () => {
  it("parses a valid CSV string into score rows", () => {
    const csv = `Player,1,2,3,4,5,6,7,8,9
John Doe,5,3,7,2,9,4,6,1,8
Jane Smith,3,6,2,8,4,7,1,5,9`;

    const result = parseCsvScores(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toEqual({
      playerName: "John Doe",
      innings: [5, 3, 7, 2, 9, 4, 6, 1, 8],
    });
    expect(result.rows[1]).toEqual({
      playerName: "Jane Smith",
      innings: [3, 6, 2, 8, 4, 7, 1, 5, 9],
    });
  });

  it("returns errors for invalid runs values", () => {
    const csv = `Player,1,2,3,4,5,6,7,8,9
Bad Player,5,3,12,2,9,4,6,1,8`;

    const result = parseCsvScores(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Row 1");
  });

  it("handles CSV with extra whitespace in player names", () => {
    const csv = `Player,1,2,3,4,5,6,7,8,9
  John Doe  ,5,3,7,2,9,4,6,1,8`;

    const result = parseCsvScores(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].playerName).toBe("John Doe");
  });

  it("returns error for rows with missing innings", () => {
    const csv = `Player,1,2,3
John Doe,5,3,7`;

    const result = parseCsvScores(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("9 innings");
  });

  it("handles empty CSV gracefully", () => {
    const result = parseCsvScores("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
