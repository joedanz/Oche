// ABOUTME: CSV parsing utilities for score import.
// ABOUTME: Parses CSV files into structured score data using PapaParse.

import Papa from "papaparse";

export interface ParsedScoreRow {
  playerName: string;
  innings: number[];
}

export interface ParseResult {
  rows: ParsedScoreRow[];
  errors: string[];
}

const REQUIRED_INNINGS = 9;

export function parseCsvScores(csvString: string): ParseResult {
  if (!csvString.trim()) {
    return { rows: [], errors: [] };
  }

  const parsed = Papa.parse<string[]>(csvString, {
    skipEmptyLines: true,
  });

  if (parsed.data.length <= 1) {
    return { rows: [], errors: [] };
  }

  // Skip header row
  const dataRows = parsed.data.slice(1);
  const rows: ParsedScoreRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const playerName = (row[0] ?? "").trim();

    if (!playerName) {
      errors.push(`Row ${i + 1}: Missing player name`);
      continue;
    }

    const inningValues = row.slice(1);
    if (inningValues.length < REQUIRED_INNINGS) {
      errors.push(
        `Row ${i + 1}: Expected ${REQUIRED_INNINGS} innings but found ${inningValues.length}`,
      );
      continue;
    }

    const innings: number[] = [];
    let hasError = false;

    for (let j = 0; j < REQUIRED_INNINGS; j++) {
      const val = parseInt(inningValues[j], 10);
      if (isNaN(val) || val < 0 || val > 9) {
        errors.push(
          `Row ${i + 1}: Invalid runs value '${inningValues[j]}' in inning ${j + 1} (must be 0-9)`,
        );
        hasError = true;
        break;
      }
      innings.push(val);
    }

    if (!hasError) {
      rows.push({ playerName, innings });
    }
  }

  return { rows, errors };
}
