// ABOUTME: Tests for multi-file merge logic.
// ABOUTME: Verifies merging, conflict detection, and resolution for imported score files.

import { describe, it, expect } from "vitest";
import {
  mergeParseResults,
  resolveConflict,
  type MergeConflict,
} from "./fileMerger";
import type { ParseResult } from "./csvParser";

describe("mergeParseResults", () => {
  it("merges rows from multiple files with no overlapping players", () => {
    const file1: ParseResult = {
      rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    };
    const file2: ParseResult = {
      rows: [{ playerName: "Bob", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
      errors: [],
    };

    const result = mergeParseResults([file1, file2]);

    expect(result.mergedRows).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
    expect(result.mergedRows.map((r) => r.playerName).sort()).toEqual([
      "Alice",
      "Bob",
    ]);
  });

  it("detects conflicts when same player has different innings data", () => {
    const file1: ParseResult = {
      rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    };
    const file2: ParseResult = {
      rows: [{ playerName: "Alice", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
      errors: [],
    };

    const result = mergeParseResults([file1, file2]);

    expect(result.mergedRows).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].playerName).toBe("Alice");
    expect(result.conflicts[0].entries).toHaveLength(2);
  });

  it("auto-merges when same player has identical data in both files", () => {
    const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const file1: ParseResult = {
      rows: [{ playerName: "Alice", innings: [...innings] }],
      errors: [],
    };
    const file2: ParseResult = {
      rows: [{ playerName: "Alice", innings: [...innings] }],
      errors: [],
    };

    const result = mergeParseResults([file1, file2]);

    expect(result.mergedRows).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
    expect(result.mergedRows[0].innings).toEqual(innings);
  });

  it("matches player names case-insensitively", () => {
    const file1: ParseResult = {
      rows: [{ playerName: "alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    };
    const file2: ParseResult = {
      rows: [{ playerName: "Alice", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
      errors: [],
    };

    const result = mergeParseResults([file1, file2]);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].playerName).toBe("alice");
  });

  it("aggregates errors from all files", () => {
    const file1: ParseResult = {
      rows: [],
      errors: ["Row 1: Missing player name"],
    };
    const file2: ParseResult = {
      rows: [],
      errors: ["Row 3: Invalid runs value"],
    };

    const result = mergeParseResults([file1, file2]);

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("File 1");
    expect(result.errors[1]).toContain("File 2");
  });

  it("handles three or more files", () => {
    const makeFile = (name: string, first: number): ParseResult => ({
      rows: [{ playerName: name, innings: [first, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    });

    const result = mergeParseResults([
      makeFile("Alice", 1),
      makeFile("Bob", 2),
      makeFile("Charlie", 3),
    ]);

    expect(result.mergedRows).toHaveLength(3);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("resolveConflict", () => {
  it("resolves a conflict by selecting an entry index", () => {
    const conflict: MergeConflict = {
      playerName: "Alice",
      entries: [
        { fileIndex: 0, innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
        { fileIndex: 1, innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] },
      ],
    };

    const resolved = resolveConflict(conflict, 1);

    expect(resolved.playerName).toBe("Alice");
    expect(resolved.innings).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it("resolves by providing custom innings", () => {
    const conflict: MergeConflict = {
      playerName: "Alice",
      entries: [
        { fileIndex: 0, innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
        { fileIndex: 1, innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] },
      ],
    };

    const customInnings = [5, 5, 5, 5, 5, 5, 5, 5, 5];
    const resolved = resolveConflict(conflict, undefined, customInnings);

    expect(resolved.innings).toEqual(customInnings);
  });
});
