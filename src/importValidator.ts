// ABOUTME: Validates imported score data against roster and data rules.
// ABOUTME: Checks player names match roster, runs are 0-9, and required columns present.

import type { ParsedScoreRow, ParseResult } from "./csvParser";

export interface ValidationError {
  row: number;
  message: string;
}

export interface ValidationResult {
  validRows: ParsedScoreRow[];
  errors: ValidationError[];
  skippedCount: number;
  importedCount: number;
}

export function validateImportData(
  parseResult: ParseResult,
  rosterNames: string[],
): ValidationResult {
  const validRows: ParsedScoreRow[] = [];
  const errors: ValidationError[] = [];

  // Include parse-level errors as row-level errors
  for (const err of parseResult.errors) {
    const match = err.match(/^Row (\d+):/);
    const row = match ? parseInt(match[1], 10) : 0;
    errors.push({ row, message: err });
  }

  const normalizedRoster = rosterNames.map((n) => n.toLowerCase().trim());

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i];
    const rowNum = i + 1;
    let hasError = false;

    // Validate player name matches roster
    if (!normalizedRoster.includes(row.playerName.toLowerCase().trim())) {
      errors.push({
        row: rowNum,
        message: `Row ${rowNum}: Player "${row.playerName}" not found on roster`,
      });
      hasError = true;
    }

    // Validate innings values are 0-9 (defensive, parser should catch this)
    for (let j = 0; j < row.innings.length; j++) {
      const val = row.innings[j];
      if (val < 0 || val > 9) {
        errors.push({
          row: rowNum,
          message: `Row ${rowNum}: Invalid runs value '${val}' in inning ${j + 1} (must be 0-9)`,
        });
        hasError = true;
        break;
      }
    }

    // Validate required innings count
    if (row.innings.length < 9) {
      errors.push({
        row: rowNum,
        message: `Row ${rowNum}: Missing innings data (found ${row.innings.length}, need 9)`,
      });
      hasError = true;
    }

    if (!hasError) {
      validRows.push(row);
    }
  }

  return {
    validRows,
    errors,
    skippedCount: parseResult.rows.length - validRows.length + parseResult.errors.length,
    importedCount: validRows.length,
  };
}
