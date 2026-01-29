// ABOUTME: Tests for Excel parsing utilities.
// ABOUTME: Verifies Excel data is correctly parsed into structured score rows.

import { describe, it, expect } from "vitest";
import { parseExcelScores } from "./excelParser";
import * as XLSX from "xlsx";

function makeWorkbook(data: (string | number)[][], sheetName = "Sheet1"): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function makeMultiSheetWorkbook(sheets: Record<string, (string | number)[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("parseExcelScores", () => {
  it("parses a valid Excel sheet into score rows", () => {
    const data = [
      ["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9],
      ["John Doe", 5, 3, 7, 2, 9, 4, 6, 1, 8],
      ["Jane Smith", 3, 6, 2, 8, 4, 7, 1, 5, 9],
    ];
    const buf = makeWorkbook(data);
    const result = parseExcelScores(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.sheetNames).toEqual(["Sheet1"]);
    expect(result.rows[0]).toEqual({
      playerName: "John Doe",
      innings: [5, 3, 7, 2, 9, 4, 6, 1, 8],
    });
  });

  it("returns errors for invalid runs values", () => {
    const data = [
      ["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9],
      ["Bad Player", 5, 3, 12, 2, 9, 4, 6, 1, 8],
    ];
    const buf = makeWorkbook(data);
    const result = parseExcelScores(buf);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Row 1");
  });

  it("returns error for rows with missing innings", () => {
    const data = [
      ["Player", 1, 2, 3],
      ["John Doe", 5, 3, 7],
    ];
    const buf = makeWorkbook(data);
    const result = parseExcelScores(buf);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("9 innings");
  });

  it("returns sheet names for multi-sheet workbooks", () => {
    const buf = makeMultiSheetWorkbook({
      Scores: [
        ["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9],
        ["John Doe", 5, 3, 7, 2, 9, 4, 6, 1, 8],
      ],
      Summary: [["Team", "Wins"], ["Eagles", 5]],
    });
    const result = parseExcelScores(buf);
    expect(result.sheetNames).toEqual(["Scores", "Summary"]);
  });

  it("parses a specific sheet by name", () => {
    const buf = makeMultiSheetWorkbook({
      Wrong: [["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9], ["Wrong Player", 0, 0, 0, 0, 0, 0, 0, 0, 0]],
      Right: [["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9], ["Right Player", 1, 2, 3, 4, 5, 6, 7, 8, 9]],
    });
    const result = parseExcelScores(buf, "Right");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].playerName).toBe("Right Player");
  });
});
