// ABOUTME: Displays import validation results with errors, preview, and summary.
// ABOUTME: Shows row-level errors and allows importing valid rows while skipping invalid ones.

import type { ParsedScoreRow } from "./csvParser";
import type { ValidationResult } from "./importValidator";

interface ImportValidationPanelProps {
  result: ValidationResult;
  onImport: (rows: ParsedScoreRow[]) => void;
  onCancel: () => void;
}

export function ImportValidationPanel({
  result,
  onImport,
  onCancel,
}: ImportValidationPanelProps) {
  const { validRows, errors, skippedCount, importedCount } = result;
  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-400">
          {importedCount} row{importedCount !== 1 ? "s" : ""} to be imported
        </span>
        {hasErrors && (
          <span className="text-red-400">
            {skippedCount} row{skippedCount !== 1 ? "s" : ""} skipped
          </span>
        )}
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className="bg-red-900/30 border border-red-700 rounded p-4">
          <h4 className="text-red-400 font-medium mb-2">Validation Errors</h4>
          <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview of valid rows */}
      {validRows.length > 0 && (
        <div className="overflow-x-auto">
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
              {validRows.map((row, i) => (
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
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onImport(validRows)}
          disabled={validRows.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import {importedCount} Row{importedCount !== 1 ? "s" : ""}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
