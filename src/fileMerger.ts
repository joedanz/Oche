// ABOUTME: Merges multiple imported score files into a single dataset.
// ABOUTME: Detects conflicts when the same player has different data across files.

import type { ParsedScoreRow, ParseResult } from "./csvParser";

export interface MergeConflictEntry {
  fileIndex: number;
  innings: number[];
}

export interface MergeConflict {
  playerName: string;
  entries: MergeConflictEntry[];
}

export interface MergeResult {
  mergedRows: ParsedScoreRow[];
  conflicts: MergeConflict[];
  errors: string[];
}

export function mergeParseResults(files: ParseResult[]): MergeResult {
  const errors: string[] = [];
  // Aggregate errors with file context
  for (let f = 0; f < files.length; f++) {
    for (const err of files[f].errors) {
      errors.push(`File ${f + 1}: ${err}`);
    }
  }

  // Group rows by normalized player name
  const playerEntries = new Map<
    string,
    { playerName: string; entries: MergeConflictEntry[] }
  >();

  for (let f = 0; f < files.length; f++) {
    for (const row of files[f].rows) {
      const key = row.playerName.toLowerCase().trim();
      if (!playerEntries.has(key)) {
        playerEntries.set(key, { playerName: row.playerName, entries: [] });
      }
      playerEntries.get(key)!.entries.push({
        fileIndex: f,
        innings: row.innings,
      });
    }
  }

  const mergedRows: ParsedScoreRow[] = [];
  const conflicts: MergeConflict[] = [];

  for (const [, { playerName, entries }] of playerEntries) {
    if (entries.length === 1) {
      mergedRows.push({ playerName, innings: entries[0].innings });
    } else {
      // Check if all entries are identical
      const allSame = entries.every(
        (e) => JSON.stringify(e.innings) === JSON.stringify(entries[0].innings),
      );
      if (allSame) {
        mergedRows.push({ playerName, innings: entries[0].innings });
      } else {
        conflicts.push({ playerName, entries });
      }
    }
  }

  return { mergedRows, conflicts, errors };
}

export function resolveConflict(
  conflict: MergeConflict,
  entryIndex?: number,
  customInnings?: number[],
): ParsedScoreRow {
  const innings =
    customInnings ?? conflict.entries[entryIndex ?? 0].innings;
  return { playerName: conflict.playerName, innings };
}
