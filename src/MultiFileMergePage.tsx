// ABOUTME: Multi-file merge page for combining imported score files into one match.
// ABOUTME: Supports uploading multiple CSV files, detecting conflicts, and manual resolution.

import { useState, useCallback } from "react";
import { parseCsvScores, type ParseResult, type ParsedScoreRow } from "./csvParser";
import {
  mergeParseResults,
  resolveConflict,
  type MergeResult,
  type MergeConflict,
} from "./fileMerger";

interface MultiFileMergePageProps {
  leagueId: string;
  matchId: string;
}

interface UploadedFile {
  name: string;
  parseResult: ParseResult;
}

export function MultiFileMergePage({
  leagueId,
  matchId,
}: MultiFileMergePageProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<
    Map<string, ParsedScoreRow>
  >(new Map());

  const handleFileAdd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = parseCsvScores(text);
        setFiles((prev) => [...prev, { name: file.name, parseResult: result }]);
        setMergeResult(null);
        setResolvedConflicts(new Map());
      };
      reader.readAsText(file);
      // Reset input so same file can be re-added
      e.target.value = "";
    },
    [],
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMergeResult(null);
    setResolvedConflicts(new Map());
  }, []);

  const handleMerge = useCallback(() => {
    const result = mergeParseResults(files.map((f) => f.parseResult));
    setMergeResult(result);
    setResolvedConflicts(new Map());
  }, [files]);

  const handleResolveConflict = useCallback(
    (conflict: MergeConflict, entryIndex: number) => {
      const resolved = resolveConflict(conflict, entryIndex);
      setResolvedConflicts((prev) => {
        const next = new Map(prev);
        next.set(conflict.playerName.toLowerCase(), resolved);
        return next;
      });
    },
    [],
  );

  const unresolvedConflicts =
    mergeResult?.conflicts.filter(
      (c) => !resolvedConflicts.has(c.playerName.toLowerCase()),
    ) ?? [];

  const allMergedRows = [
    ...(mergeResult?.mergedRows ?? []),
    ...Array.from(resolvedConflicts.values()),
  ];

  const handleImport = useCallback(() => {
    if (allMergedRows.length === 0) return;
    // TODO: Call Convex mutation to save merged scores
    void leagueId;
    void matchId;
  }, [allMergedRows, leagueId, matchId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Merge Import Files</h2>

      {/* File upload */}
      <div className="mb-6">
        <label
          htmlFor="merge-file-input"
          className="block text-sm font-medium mb-2"
        >
          Add file
        </label>
        <input
          id="merge-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileAdd}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-medium text-gray-400">
            Uploaded Files ({files.length})
          </h3>
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-800 rounded p-3"
            >
              <span className="text-sm">{f.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {f.parseResult.rows.length} row
                  {f.parseResult.rows.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="text-red-400 text-sm hover:text-red-300"
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merge button */}
      <button
        onClick={handleMerge}
        disabled={files.length < 2}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        Merge Files
      </button>

      {/* Errors */}
      {mergeResult && mergeResult.errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-6">
          <h3 className="text-red-400 font-medium mb-2">Parse Errors</h3>
          <ul className="list-disc list-inside text-sm text-red-300">
            {mergeResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflicts */}
      {unresolvedConflicts.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-700 rounded p-4 mb-6">
          <h3 className="text-amber-400 font-medium mb-4">
            {unresolvedConflicts.length} Conflict
            {unresolvedConflicts.length !== 1 ? "s" : ""} Found
          </h3>
          {unresolvedConflicts.map((conflict) => (
            <div key={conflict.playerName} className="mb-4 last:mb-0">
              <p className="text-sm font-medium mb-2">
                {conflict.playerName} — different data in{" "}
                {conflict.entries.length} files
              </p>
              <div className="space-y-2">
                {conflict.entries.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-gray-800 rounded p-2"
                  >
                    <span className="text-xs text-gray-400 w-16">
                      File {entry.fileIndex + 1}
                    </span>
                    <span className="text-sm font-mono flex-1">
                      {entry.innings.join(", ")}
                    </span>
                    <button
                      onClick={() => handleResolveConflict(conflict, i)}
                      className="text-blue-400 text-sm hover:text-blue-300"
                    >
                      Use File {entry.fileIndex + 1}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merged preview */}
      {mergeResult && allMergedRows.length > 0 && unresolvedConflicts.length === 0 && (
        <>
          <div className="overflow-x-auto mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Merged Preview ({allMergedRows.length} players)
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">Player</th>
                  {Array.from({ length: 9 }, (_, i) => (
                    <th key={i} className="text-center p-2">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allMergedRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="p-2">{row.playerName}</td>
                    {row.innings.map((runs, j) => (
                      <td key={j} className="text-center p-2">
                        {runs}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Import {allMergedRows.length} Row
            {allMergedRows.length !== 1 ? "s" : ""}
          </button>
        </>
      )}
    </div>
  );
}
