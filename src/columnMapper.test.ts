// ABOUTME: Tests for column mapping logic and auto-detection.
// ABOUTME: Validates mapping application and common column name detection.

import { describe, it, expect } from "vitest";
import {
  applyColumnMapping,
  autoDetectMapping,
  type ColumnMapping,
} from "./columnMapper";

describe("autoDetectMapping", () => {
  it("detects standard column names", () => {
    const headers = ["Player", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const mapping = autoDetectMapping(headers);
    expect(mapping.playerName).toBe(0);
    expect(mapping.innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("detects alternative column names case-insensitively", () => {
    const headers = [
      "Name",
      "Inning 1",
      "Inning 2",
      "Inning 3",
      "Inning 4",
      "Inning 5",
      "Inning 6",
      "Inning 7",
      "Inning 8",
      "Inning 9",
      "Plus",
      "Minus",
    ];
    const mapping = autoDetectMapping(headers);
    expect(mapping.playerName).toBe(0);
    expect(mapping.innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(mapping.plus).toBe(10);
    expect(mapping.minus).toBe(11);
  });

  it("detects numbered columns without prefix", () => {
    const headers = ["Shooter", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const mapping = autoDetectMapping(headers);
    expect(mapping.playerName).toBe(0);
    expect(mapping.innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("returns partial mapping when columns not recognized", () => {
    const headers = ["Col A", "Col B", "Col C"];
    const mapping = autoDetectMapping(headers);
    expect(mapping.playerName).toBeUndefined();
    expect(mapping.innings).toEqual([]);
  });
});

describe("applyColumnMapping", () => {
  it("extracts data using mapping", () => {
    const rawData = [
      ["Alice", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      ["Bob", "0", "1", "0", "1", "0", "1", "0", "1", "0"],
    ];
    const mapping: ColumnMapping = {
      playerName: 0,
      innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].playerName).toBe("Alice");
    expect(result.rows[0].innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.rows[1].playerName).toBe("Bob");
    expect(result.rows[1].innings).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(result.errors).toEqual([]);
  });

  it("reports errors for invalid runs values", () => {
    const rawData = [["Alice", "1", "12", "3", "4", "5", "6", "7", "8", "9"]];
    const mapping: ColumnMapping = {
      playerName: 0,
      innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Row 1");
    expect(result.errors[0]).toContain("inning 2");
  });

  it("skips rows with missing player name", () => {
    const rawData = [
      ["", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      ["Bob", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
    ];
    const mapping: ColumnMapping = {
      playerName: 0,
      innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Missing player name");
  });

  it("requires playerName mapping", () => {
    const rawData = [["Alice", "1", "2", "3", "4", "5", "6", "7", "8", "9"]];
    const mapping: ColumnMapping = {
      innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("Player name column");
  });

  it("requires exactly 9 innings mapped", () => {
    const rawData = [["Alice", "1", "2", "3"]];
    const mapping: ColumnMapping = {
      playerName: 0,
      innings: [1, 2, 3],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("9 innings");
  });

  it("handles non-contiguous column mapping", () => {
    // Columns: Name, Extra, Inn1, Inn2, ..., Inn9
    const rawData = [
      ["Alice", "skip", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    ];
    const mapping: ColumnMapping = {
      playerName: 0,
      innings: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    };
    const result = applyColumnMapping(rawData, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
