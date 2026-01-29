// ABOUTME: Column mapping logic for spreadsheet score imports.
// ABOUTME: Auto-detects column meanings and applies user-defined mappings to raw data.

import type { ParsedScoreRow, ParseResult } from "./csvParser";

export interface ColumnMapping {
  playerName?: number;
  innings: number[];
  plus?: number;
  minus?: number;
}

const REQUIRED_INNINGS = 9;

const PLAYER_NAME_PATTERNS = [
  /^player$/i,
  /^name$/i,
  /^shooter$/i,
  /^player\s*name$/i,
];

const PLUS_PATTERNS = [/^plus$/i, /^total\s*plus$/i, /^\+$/];
const MINUS_PATTERNS = [/^minus$/i, /^total\s*minus$/i, /^-$/];

function matchesInning(header: string, inningNum: number): boolean {
  const trimmed = header.trim();
  if (trimmed === String(inningNum)) return true;
  if (/^inn(ing)?\s*\d+$/i.test(trimmed)) {
    const num = parseInt(trimmed.replace(/\D+/g, ""), 10);
    return num === inningNum;
  }
  return false;
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { innings: [] };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();

    if (
      mapping.playerName === undefined &&
      PLAYER_NAME_PATTERNS.some((p) => p.test(h))
    ) {
      mapping.playerName = i;
      continue;
    }

    if (
      mapping.plus === undefined &&
      PLUS_PATTERNS.some((p) => p.test(h))
    ) {
      mapping.plus = i;
      continue;
    }

    if (
      mapping.minus === undefined &&
      MINUS_PATTERNS.some((p) => p.test(h))
    ) {
      mapping.minus = i;
      continue;
    }
  }

  // Detect innings columns (look for columns matching 1-9 in order)
  for (let inning = 1; inning <= REQUIRED_INNINGS; inning++) {
    const idx = headers.findIndex((h) => matchesInning(h, inning));
    if (idx !== -1) {
      mapping.innings.push(idx);
    }
  }

  return mapping;
}

export function applyColumnMapping(
  rawData: string[][],
  mapping: ColumnMapping,
): ParseResult {
  if (mapping.playerName === undefined) {
    return { rows: [], errors: ["Player name column must be mapped."] };
  }

  if (mapping.innings.length !== REQUIRED_INNINGS) {
    return {
      rows: [],
      errors: [
        `Exactly 9 innings must be mapped (found ${mapping.innings.length}).`,
      ],
    };
  }

  const rows: ParsedScoreRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const playerName = (row[mapping.playerName] ?? "").trim();

    if (!playerName) {
      errors.push(`Row ${i + 1}: Missing player name`);
      continue;
    }

    const innings: number[] = [];
    let hasError = false;

    for (let j = 0; j < REQUIRED_INNINGS; j++) {
      const colIdx = mapping.innings[j];
      const val = parseInt(row[colIdx] ?? "", 10);
      if (isNaN(val) || val < 0 || val > 9) {
        errors.push(
          `Row ${i + 1}: Invalid runs value '${row[colIdx]}' in inning ${j + 1} (must be 0-9)`,
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
