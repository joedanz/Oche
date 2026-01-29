// ABOUTME: CSV file upload page for importing scores from spreadsheets.
// ABOUTME: Parses CSV with PapaParse and shows preview before import.

import { useState, useCallback } from "react";
import { parseCsvScores, type ParsedScoreRow } from "./csvParser";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface CsvUploadPageProps {
  leagueId: string;
  matchId: string;
}

export function CsvUploadPage({ leagueId, matchId }: CsvUploadPageProps) {
  const { isLoading, canUse } = usePlan();
  const [preview, setPreview] = useState<ParsedScoreRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = parseCsvScores(text);
        if (result.errors.length > 0) {
          setErrors(result.errors);
          setPreview(null);
        } else {
          setPreview(result.rows);
          setErrors([]);
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleImport = useCallback(() => {
    if (!preview) return;
    // TODO: Call Convex mutation to save imported scores
    void leagueId;
    void matchId;
  }, [preview, leagueId, matchId]);

  if (isLoading) return null;
  if (!canUse("score_import")) {
    return <UpgradePrompt message="Score import requires a League plan or higher." />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Import CSV Scores</h2>

      <div className="mb-6">
        <label htmlFor="csv-file" className="block text-sm font-medium mb-2">
          Select CSV file
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
      </div>

      {fileName && (
        <p className="text-sm text-gray-400 mb-4">
          File: {fileName}
        </p>
      )}

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-6">
          <h3 className="text-red-400 font-medium mb-2">Errors found</h3>
          <ul className="list-disc list-inside text-sm text-red-300">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {preview && preview.length > 0 && (
        <>
          <div className="overflow-x-auto mb-6">
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
                {preview.map((row, i) => (
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
            Import Scores
          </button>
        </>
      )}
    </div>
  );
}
