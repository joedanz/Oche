// ABOUTME: Step-by-step wizard for mapping spreadsheet columns to score fields.
// ABOUTME: Auto-detects common column names and supports saving/loading templates.

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  autoDetectMapping,
  applyColumnMapping,
  type ColumnMapping,
} from "./columnMapper";
import type { ParseResult } from "./csvParser";

interface ColumnMappingWizardProps {
  headers: string[];
  rawData: string[][];
  leagueId: string;
  onMappingComplete: (result: ParseResult) => void;
}

export function ColumnMappingWizard({
  headers,
  rawData,
  leagueId,
  onMappingComplete,
}: ColumnMappingWizardProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    autoDetectMapping(headers),
  );
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const templates = useQuery(api.importTemplates.getTemplates, {
    leagueId: leagueId as any,
  });
  const saveTemplate = useMutation(api.importTemplates.saveTemplate);

  const columnOptions = headers.map((h, i) => ({ label: h, value: i }));

  const handlePlayerNameChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMapping((m) => ({ ...m, playerName: parseInt(e.target.value, 10) }));
      setPreview(null);
    },
    [],
  );

  const handleInningChange = useCallback(
    (inningIdx: number, colIdx: number) => {
      setMapping((m) => {
        const newInnings = [...m.innings];
        newInnings[inningIdx] = colIdx;
        return { ...m, innings: newInnings };
      });
      setPreview(null);
    },
    [],
  );

  const handlePlusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setMapping((m) => ({
        ...m,
        plus: val === "" ? undefined : parseInt(val, 10),
      }));
    },
    [],
  );

  const handleMinusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setMapping((m) => ({
        ...m,
        minus: val === "" ? undefined : parseInt(val, 10),
      }));
    },
    [],
  );

  const handlePreview = useCallback(() => {
    const result = applyColumnMapping(rawData, mapping);
    if (result.errors.length > 0 && result.rows.length === 0) {
      setErrors(result.errors);
      setPreview(null);
    } else {
      setPreview(result);
      setErrors([]);
    }
  }, [rawData, mapping]);

  const handleConfirm = useCallback(() => {
    if (preview) {
      onMappingComplete(preview);
    }
  }, [preview, onMappingComplete]);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) return;
    await saveTemplate({
      leagueId: leagueId as any,
      name: templateName.trim(),
      mapping,
    });
    setShowSaveTemplate(false);
    setTemplateName("");
  }, [saveTemplate, leagueId, templateName, mapping]);

  const handleLoadTemplate = useCallback(
    (tmpl: { mapping: ColumnMapping }) => {
      setMapping(tmpl.mapping);
      setPreview(null);
      setErrors([]);
    },
    [],
  );

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Map Columns</h3>

      {/* Saved templates */}
      {templates && templates.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Saved templates:</p>
          <div className="flex gap-2 flex-wrap">
            {templates.map((t: any) => (
              <button
                key={t._id}
                onClick={() => handleLoadTemplate(t)}
                className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Column mapping form */}
      <div className="grid gap-4">
        <div>
          <label htmlFor="map-player-name" className="block text-sm font-medium mb-1">
            Player Name
          </label>
          <select
            id="map-player-name"
            value={mapping.playerName ?? ""}
            onChange={handlePlayerNameChange}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm w-full"
          >
            <option value="">-- Select column --</option>
            {columnOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} (Column {opt.value + 1})
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Innings 1–9</p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i}>
                <label
                  htmlFor={`map-inning-${i + 1}`}
                  className="block text-xs text-gray-400"
                >
                  Inning {i + 1}
                </label>
                <select
                  id={`map-inning-${i + 1}`}
                  value={mapping.innings[i] ?? ""}
                  onChange={(e) =>
                    handleInningChange(i, parseInt(e.target.value, 10))
                  }
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm w-full"
                >
                  <option value="">--</option>
                  {columnOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="map-plus" className="block text-sm font-medium mb-1">
              Plus
            </label>
            <select
              id="map-plus"
              value={mapping.plus ?? ""}
              onChange={handlePlusChange}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm w-full"
            >
              <option value="">-- None --</option>
              {columnOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="map-minus" className="block text-sm font-medium mb-1">
              Minus
            </label>
            <select
              id="map-minus"
              value={mapping.minus ?? ""}
              onChange={handleMinusChange}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm w-full"
            >
              <option value="">-- None --</option>
              {columnOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Preview
        </button>
        <button
          onClick={() => setShowSaveTemplate(true)}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Save as Template
        </button>
      </div>

      {/* Save template form */}
      {showSaveTemplate && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Template name…"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleSaveTemplate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded p-4">
          <ul className="list-disc list-inside text-sm text-red-300">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {preview && preview.rows.length > 0 && (
        <>
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
                {preview.rows.map((row, i) => (
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

          {preview.errors.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4">
              <p className="text-sm text-yellow-300 font-medium mb-1">
                {preview.errors.length} row(s) skipped:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-300">
                {preview.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleConfirm}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Confirm Import
          </button>
        </>
      )}
    </div>
  );
}
