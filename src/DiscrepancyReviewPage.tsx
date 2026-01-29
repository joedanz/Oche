// ABOUTME: Admin review page for dual score entry discrepancies.
// ABOUTME: Shows both captain entries side-by-side with highlighted differences and resolution controls.

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface DiscrepancyReviewPageProps {
  gameId: Id<"games">;
  leagueId: Id<"leagues">;
}

interface InningData {
  inningNumber: number;
  batter: "home" | "visitor";
  runs: number;
  isExtra: boolean;
}

interface ScoreEntry {
  _id: string;
  side: "home" | "visitor";
  submittedBy: string;
  innings: InningData[];
  status: string;
}

export function DiscrepancyReviewPage({ gameId, leagueId }: DiscrepancyReviewPageProps) {
  const entries = useQuery(api.dualEntry.getScoreEntries, { gameId, leagueId }) as
    | ScoreEntry[]
    | undefined
    | null;
  const resolveDiscrepancy = useMutation(api.dualEntry.resolveDiscrepancy);

  if (entries === undefined) {
    return <p>Loading…</p>;
  }

  if (entries === null || entries.length === 0) {
    return <p>No score entries for this game.</p>;
  }

  const homeEntry = entries.find((e) => e.side === "home");
  const visitorEntry = entries.find((e) => e.side === "visitor");
  const status = entries[0]?.status;

  // Single entry — waiting for other side
  if (entries.length === 1) {
    return (
      <div>
        <p className="text-yellow-400">
          Waiting for {homeEntry ? "visitor" : "home"} captain to submit scores.
        </p>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">
            {homeEntry ? "Home" : "Visitor"} entry ({entries[0].status})
          </h3>
          <InningsTable innings={entries[0].innings} />
        </div>
      </div>
    );
  }

  // Both entries exist
  const isDiscrepancy = status === "discrepancy";
  const isConfirmed = status === "confirmed";
  const isResolved = status === "resolved";

  // Build diff data
  const homeMap = new Map<string, number>();
  for (const i of homeEntry?.innings ?? []) {
    homeMap.set(`${i.inningNumber}-${i.batter}`, i.runs);
  }
  const visitorMap = new Map<string, number>();
  for (const i of visitorEntry?.innings ?? []) {
    visitorMap.set(`${i.inningNumber}-${i.batter}`, i.runs);
  }
  const allKeys = new Set([...homeMap.keys(), ...visitorMap.keys()]);
  const sortedKeys = [...allKeys].sort((a, b) => {
    const [aNum, aBatter] = a.split("-");
    const [bNum] = b.split("-");
    if (aNum !== bNum) return parseInt(aNum) - parseInt(bNum);
    return aBatter === "home" ? -1 : 1;
  });

  return (
    <div>
      <div className="mb-4">
        {isConfirmed && (
          <span className="inline-block bg-green-800 text-green-200 text-sm px-3 py-1 rounded">
            Confirmed — scores match
          </span>
        )}
        {isDiscrepancy && (
          <span className="inline-block bg-red-800 text-red-200 text-sm px-3 py-1 rounded">
            Discrepancy — review required
          </span>
        )}
        {isResolved && (
          <span className="inline-block bg-blue-800 text-blue-200 text-sm px-3 py-1 rounded">
            Resolved
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse w-full text-sm">
          <thead>
            <tr>
              <th className="border border-gray-600 px-2 py-1 text-left">Inning</th>
              <th className="border border-gray-600 px-2 py-1 text-left">Batter</th>
              <th className="border border-gray-600 px-2 py-1 text-center">Home entry</th>
              <th className="border border-gray-600 px-2 py-1 text-center">Visitor entry</th>
            </tr>
          </thead>
          <tbody>
            {sortedKeys.map((key) => {
              const [inningStr, batter] = key.split("-");
              const homeRuns = homeMap.get(key);
              const visitorRuns = visitorMap.get(key);
              const differs = homeRuns !== visitorRuns;
              return (
                <tr
                  key={key}
                  className={differs ? "bg-red-900/30" : ""}
                >
                  <td className="border border-gray-600 px-2 py-1">{inningStr}</td>
                  <td className="border border-gray-600 px-2 py-1">{batter}</td>
                  <td className={`border border-gray-600 px-2 py-1 text-center ${differs ? "text-red-300 font-bold" : ""}`}>
                    {homeRuns ?? "—"}
                  </td>
                  <td className={`border border-gray-600 px-2 py-1 text-center ${differs ? "text-red-300 font-bold" : ""}`}>
                    {visitorRuns ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isDiscrepancy && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() =>
              resolveDiscrepancy({ gameId, leagueId, chosenSide: "home" })
            }
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
          >
            Accept Home
          </button>
          <button
            onClick={() =>
              resolveDiscrepancy({ gameId, leagueId, chosenSide: "visitor" })
            }
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm"
          >
            Accept Visitor
          </button>
        </div>
      )}
    </div>
  );
}

function InningsTable({ innings }: { innings: InningData[] }) {
  return (
    <table className="border-collapse text-sm">
      <thead>
        <tr>
          <th className="border border-gray-600 px-2 py-1">Inning</th>
          <th className="border border-gray-600 px-2 py-1">Batter</th>
          <th className="border border-gray-600 px-2 py-1">Runs</th>
        </tr>
      </thead>
      <tbody>
        {innings.map((i, idx) => (
          <tr key={idx}>
            <td className="border border-gray-600 px-2 py-1">{i.inningNumber}</td>
            <td className="border border-gray-600 px-2 py-1">{i.batter}</td>
            <td className="border border-gray-600 px-2 py-1 text-center">{i.runs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
