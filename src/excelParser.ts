// ABOUTME: Excel parsing utilities for score import.
// ABOUTME: Parses .xlsx/.xls files into structured score data using SheetJS.

import * as XLSX from "xlsx";
import type { ParsedScoreRow } from "./csvParser";

export interface ExcelParseResult {
  rows: ParsedScoreRow[];
  errors: string[];
  sheetNames: string[];
}

const REQUIRED_INNINGS = 9;

export function parseExcelScores(
  data: ArrayBuffer,
  sheetName?: string,
): ExcelParseResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetNames = workbook.SheetNames;

  const targetSheet = sheetName ?? sheetNames[0];
  const worksheet = workbook.Sheets[targetSheet];

  if (!worksheet) {
    return { rows: [], errors: [`Sheet "${targetSheet}" not found`], sheetNames };
  }

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length <= 1) {
    return { rows: [], errors: [], sheetNames };
  }

  // Skip header row
  const dataRows = rawRows.slice(1);
  const rows: ParsedScoreRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const playerName = String(row[0] ?? "").trim();

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
      const val = Number(inningValues[j]);
      if (isNaN(val) || val < 0 || val > 9 || !Number.isInteger(val)) {
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

  return { rows, errors, sheetNames };
}
