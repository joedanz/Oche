// ABOUTME: Innings score entry grid for a single game, mirroring paper scoresheets.
// ABOUTME: Grid rows for home/visitor, columns for innings 1-9, with keyboard navigation.

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface ScoringGridProps {
  gameId: Id<"games">;
  leagueId: Id<"leagues">;
  homePlayerName: string;
  visitorPlayerName: string;
}

const REGULATION_INNINGS = 9;

export function ScoringGrid({
  gameId,
  leagueId,
  homePlayerName,
  visitorPlayerName,
}: ScoringGridProps) {
  const existingInnings = useQuery(api.scoring.getGameInnings, {
    gameId,
    leagueId,
  });
  const saveInnings = useMutation(api.scoring.saveInnings);

  // Grid state: [row][col] where row 0=home, row 1=visitor
  const [grid, setGrid] = useState<(number | null)[][]>(() => [
    Array(REGULATION_INNINGS).fill(null),
    Array(REGULATION_INNINGS).fill(null),
  ]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([[], []]);

  // Populate grid from existing data
  useEffect(() => {
    if (existingInnings && !initialized) {
      const newGrid: (number | null)[][] = [
        Array(REGULATION_INNINGS).fill(null),
        Array(REGULATION_INNINGS).fill(null),
      ];
      for (const inning of existingInnings) {
        if (inning.isExtra) continue; // Only regular innings in this grid
        const row = inning.batter === "home" ? 0 : 1;
        const col = inning.inningNumber - 1;
        if (col >= 0 && col < REGULATION_INNINGS) {
          newGrid[row][col] = inning.runs;
        }
      }
      setGrid(newGrid);
      setInitialized(true);
    }
  }, [existingInnings, initialized]);

  const setCell = useCallback(
    (row: number, col: number, value: number | null) => {
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = value;
        return next;
      });
    },
    [],
  );

  const handleKeyDown = useCallback(
    (row: number, col: number, e: React.KeyboardEvent) => {
      let nextRow = row;
      let nextCol = col;

      if (e.key === "ArrowRight" || e.key === "Tab") {
        if (!e.shiftKey) {
          e.preventDefault();
          nextCol = col + 1;
          if (nextCol >= REGULATION_INNINGS) {
            nextCol = 0;
            nextRow = (row + 1) % 2;
          }
        }
      } else if (e.key === "ArrowLeft") {
        nextCol = col - 1;
        if (nextCol < 0) {
          nextCol = REGULATION_INNINGS - 1;
          nextRow = (row + 1) % 2;
        }
      } else if (e.key === "ArrowDown") {
        nextRow = (row + 1) % 2;
      } else if (e.key === "ArrowUp") {
        nextRow = (row + 1) % 2;
      }

      if (nextRow !== row || nextCol !== col) {
        inputRefs.current[nextRow]?.[nextCol]?.focus();
      }
    },
    [],
  );

  const handleInput = useCallback(
    (row: number, col: number, value: string) => {
      if (value === "") {
        setCell(row, col, null);
        return;
      }
      const num = parseInt(value.slice(-1), 10);
      if (isNaN(num) || num < 0 || num > 9) return;
      setCell(row, col, num);

      // Auto-advance to next cell
      let nextCol = col + 1;
      let nextRow = row;
      if (nextCol >= REGULATION_INNINGS) {
        nextCol = 0;
        nextRow = (row + 1) % 2;
      }
      inputRefs.current[nextRow]?.[nextCol]?.focus();
    },
    [setCell],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const innings: {
        inningNumber: number;
        batter: "home" | "visitor";
        runs: number;
        isExtra: boolean;
      }[] = [];

      for (let col = 0; col < REGULATION_INNINGS; col++) {
        for (let row = 0; row < 2; row++) {
          const runs = grid[row][col];
          if (runs !== null) {
            innings.push({
              inningNumber: col + 1,
              batter: row === 0 ? "home" : "visitor",
              runs,
              isExtra: false,
            });
          }
        }
      }

      await saveInnings({ gameId, leagueId, innings });
    } finally {
      setSaving(false);
    }
  }, [grid, gameId, leagueId, saveInnings]);

  if (existingInnings === undefined) {
    return <p>Loading…</p>;
  }

  const inningHeaders = Array.from({ length: REGULATION_INNINGS }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr>
            <th className="border border-gray-600 px-2 py-1 text-left w-28">
              Player
            </th>
            {inningHeaders.map((n) => (
              <th
                key={n}
                className="border border-gray-600 px-2 py-1 text-center w-10"
              >
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((row) => (
            <tr
              key={row}
              className={
                row === 0
                  ? "bg-blue-950/30"
                  : "bg-red-950/30"
              }
            >
              <td className="border border-gray-600 px-2 py-1 font-medium">
                {row === 0 ? homePlayerName : visitorPlayerName}
              </td>
              {inningHeaders.map((n, col) => (
                <td
                  key={col}
                  className="border border-gray-600 p-0 text-center"
                >
                  <input
                    ref={(el) => {
                      if (!inputRefs.current[row]) inputRefs.current[row] = [];
                      inputRefs.current[row][col] = el;
                    }}
                    type="number"
                    min={0}
                    max={9}
                    value={grid[row][col] ?? ""}
                    onChange={(e) => handleInput(row, col, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(row, col, e)}
                    className="w-full h-full text-center bg-transparent border-none outline-none p-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`${row === 0 ? "Home" : "Visitor"} inning ${n}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          {saving ? "Saving…" : "Save Scores"}
        </button>
      </div>
    </div>
  );
}
