// ABOUTME: Innings score entry grid for a single game, mirroring paper scoresheets.
// ABOUTME: Grid rows for home/visitor, columns for innings 1-9 plus extra innings, with keyboard navigation.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  // Columns 0-8 are regulation innings 1-9, columns 9+ are extra innings
  const [grid, setGrid] = useState<(number | null)[][]>(() => [
    Array(REGULATION_INNINGS).fill(null),
    Array(REGULATION_INNINGS).fill(null),
  ]);
  const [extraCount, setExtraCount] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([[], []]);

  const totalColumns = REGULATION_INNINGS + extraCount;

  // Populate grid from existing data
  useEffect(() => {
    if (existingInnings && !initialized) {
      let maxExtraInning = 0;
      for (const inning of existingInnings) {
        if (inning.isExtra && inning.inningNumber > maxExtraInning) {
          maxExtraInning = inning.inningNumber;
        }
      }
      const extras = maxExtraInning > 0 ? maxExtraInning - REGULATION_INNINGS : 0;
      const cols = REGULATION_INNINGS + extras;

      const newGrid: (number | null)[][] = [
        Array(cols).fill(null),
        Array(cols).fill(null),
      ];
      for (const inning of existingInnings) {
        const row = inning.batter === "home" ? 0 : 1;
        if (inning.isExtra) {
          const col = REGULATION_INNINGS + (inning.inningNumber - REGULATION_INNINGS - 1);
          if (col >= 0 && col < cols) {
            newGrid[row][col] = inning.runs;
          }
        } else {
          const col = inning.inningNumber - 1;
          if (col >= 0 && col < REGULATION_INNINGS) {
            newGrid[row][col] = inning.runs;
          }
        }
      }
      setGrid(newGrid);
      setExtraCount(extras);
      setInitialized(true);
    }
  }, [existingInnings, initialized]);

  // Calculate Plus, Minus, Total from regulation innings only
  const totals = useMemo(() => {
    let homePlus = 0;
    let visitorPlus = 0;
    for (let col = 0; col < REGULATION_INNINGS; col++) {
      homePlus += grid[0][col] ?? 0;
      visitorPlus += grid[1][col] ?? 0;
    }
    return {
      homePlus,
      visitorPlus,
      homeMinus: visitorPlus,
      visitorMinus: homePlus,
      homeTotal: homePlus - visitorPlus,
      visitorTotal: visitorPlus - homePlus,
    };
  }, [grid]);

  // Count high innings (9-run innings) per player
  const highInningsCounts = useMemo(() => {
    let home = 0;
    let visitor = 0;
    for (let col = 0; col < totalColumns; col++) {
      if (grid[0][col] === 9) home++;
      if (grid[1][col] === 9) visitor++;
    }
    return { home, visitor };
  }, [grid, totalColumns]);

  // Check if regulation innings are tied
  const regulationTied = useMemo(() => {
    let homeTotal = 0;
    let visitorTotal = 0;
    let allFilled = true;
    for (let col = 0; col < REGULATION_INNINGS; col++) {
      if (grid[0][col] === null || grid[1][col] === null) {
        allFilled = false;
        break;
      }
      homeTotal += grid[0][col]!;
      visitorTotal += grid[1][col]!;
    }
    return allFilled && homeTotal === visitorTotal;
  }, [grid]);

  const addExtraInning = useCallback(() => {
    const newExtra = extraCount + 1;
    setExtraCount(newExtra);
    setGrid((prev) => [
      [...prev[0], null],
      [...prev[1], null],
    ]);
  }, [extraCount]);

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
          if (nextCol >= totalColumns) {
            nextCol = 0;
            nextRow = (row + 1) % 2;
          }
        }
      } else if (e.key === "ArrowLeft") {
        nextCol = col - 1;
        if (nextCol < 0) {
          nextCol = totalColumns - 1;
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
    [totalColumns],
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
      if (nextCol >= totalColumns) {
        nextCol = 0;
        nextRow = (row + 1) % 2;
      }
      inputRefs.current[nextRow]?.[nextCol]?.focus();
    },
    [setCell, totalColumns],
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

      for (let col = 0; col < totalColumns; col++) {
        const isExtra = col >= REGULATION_INNINGS;
        const inningNumber = isExtra
          ? REGULATION_INNINGS + (col - REGULATION_INNINGS + 1)
          : col + 1;

        for (let row = 0; row < 2; row++) {
          const runs = grid[row][col];
          if (runs !== null) {
            innings.push({
              inningNumber,
              batter: row === 0 ? "home" : "visitor",
              runs,
              isExtra,
            });
          }
        }
      }

      await saveInnings({ gameId, leagueId, innings });
    } finally {
      setSaving(false);
    }
  }, [grid, gameId, leagueId, saveInnings, totalColumns]);

  if (existingInnings === undefined) {
    return <p>Loading…</p>;
  }

  return (
    <div className="overflow-x-auto touch-action-manipulation" data-testid="scoring-grid-container">
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr>
            <th className="border border-gray-600 px-2 py-1 text-left w-28">
              Player
            </th>
            {Array.from({ length: totalColumns }, (_, i) => {
              const isExtra = i >= REGULATION_INNINGS;
              return (
                <th
                  key={i}
                  className={`border border-gray-600 px-2 py-1 text-center w-10 ${isExtra ? "bg-amber-900/40 border-amber-600" : ""}`}
                >
                  {isExtra ? `E${i - REGULATION_INNINGS + 1}` : i + 1}
                </th>
              );
            })}
            <th className="border border-gray-600 px-2 py-1 text-center w-12">Plus</th>
            <th className="border border-gray-600 px-2 py-1 text-center w-12">Minus</th>
            <th className="border border-gray-600 px-2 py-1 text-center w-12">Total</th>
            <th className="border border-gray-600 px-2 py-1 text-center w-10">9s</th>
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
              {Array.from({ length: totalColumns }, (_, col) => {
                const isExtra = col >= REGULATION_INNINGS;
                const isHighInning = grid[row][col] === 9;
                return (
                  <td
                    key={col}
                    {...(isHighInning ? { "data-high-inning": "true" } : {})}
                    className={`border border-gray-600 p-0 text-center ${isExtra ? "bg-amber-900/20 border-amber-600" : ""} ${isHighInning ? "bg-yellow-500/30 font-bold" : ""}`}
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
                      inputMode="numeric"
                      className="w-full h-full min-h-[44px] text-center bg-transparent border-none outline-none p-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`${row === 0 ? "Home" : "Visitor"} ${isExtra ? "extra " : ""}inning ${isExtra ? `E${col - REGULATION_INNINGS + 1}` : col + 1}`}
                    />
                  </td>
                );
              })}
              <td data-testid={`${row === 0 ? "home" : "visitor"}-plus`} className="border border-gray-600 px-2 py-1 text-center font-semibold">
                {row === 0 ? totals.homePlus : totals.visitorPlus}
              </td>
              <td data-testid={`${row === 0 ? "home" : "visitor"}-minus`} className="border border-gray-600 px-2 py-1 text-center font-semibold">
                {row === 0 ? totals.homeMinus : totals.visitorMinus}
              </td>
              <td data-testid={`${row === 0 ? "home" : "visitor"}-total`} className="border border-gray-600 px-2 py-1 text-center font-bold">
                {row === 0 ? totals.homeTotal : totals.visitorTotal}
              </td>
              <td data-testid={`${row === 0 ? "home" : "visitor"}-high-innings`} className="border border-gray-600 px-2 py-1 text-center font-semibold text-yellow-400">
                {row === 0 ? highInningsCounts.home : highInningsCounts.visitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 min-h-[44px] rounded text-sm"
        >
          {saving ? "Saving…" : "Save Scores"}
        </button>
        {regulationTied && (
          <button
            onClick={addExtraInning}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 min-h-[44px] rounded text-sm"
          >
            Add Extra Inning
          </button>
        )}
      </div>
    </div>
  );
}
