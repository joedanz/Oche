// ABOUTME: Tests for import validation logic.
// ABOUTME: Validates roster matching, runs range, required columns, and skip/summary counts.

import { describe, it, expect } from "vitest";
import { validateImportData } from "./importValidator";
import type { ParseResult } from "./csvParser";

const makeRow = (name: string, innings: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]) => ({
  playerName: name,
  innings,
});

describe("validateImportData", () => {
  const roster = ["Alice", "Bob", "Charlie"];

  it("passes all rows when names match roster and data is valid", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice"), makeRow("Bob")],
      errors: [],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });

  it("flags players not on the roster", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice"), makeRow("Unknown Player")],
      errors: [],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].playerName).toBe("Alice");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Unknown Player");
    expect(result.errors[0].message).toContain("not found on roster");
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it("is case-insensitive for roster matching", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("alice"), makeRow("BOB")],
      errors: [],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("includes parse-level errors in results", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice")],
      errors: ["Row 3: Invalid runs value '12' in inning 3 (must be 0-9)"],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
    expect(result.skippedCount).toBe(1);
  });

  it("validates innings count is at least 9", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice", [1, 2, 3])],
      errors: [],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Missing innings data");
  });

  it("computes correct summary counts with mixed valid and invalid rows", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice"), makeRow("Unknown"), makeRow("Bob"), makeRow("Nobody")],
      errors: ["Row 5: Missing player name"],
    };
    const result = validateImportData(parseResult, roster);
    expect(result.importedCount).toBe(2);
    expect(result.skippedCount).toBe(3); // 2 unmatched + 1 parse error
  });

  it("handles empty roster by flagging all rows", () => {
    const parseResult: ParseResult = {
      rows: [makeRow("Alice")],
      errors: [],
    };
    const result = validateImportData(parseResult, []);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("handles empty parse result", () => {
    const parseResult: ParseResult = { rows: [], errors: [] };
    const result = validateImportData(parseResult, roster);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
  });
});
