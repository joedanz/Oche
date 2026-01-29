// ABOUTME: Handicap configuration settings page for league admins.
// ABOUTME: Allows enabling handicapping, setting percentage, and choosing recalculation frequency.

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface HandicapConfigPageProps {
  leagueId: Id<"leagues">;
}

export function HandicapConfigPage({ leagueId }: HandicapConfigPageProps) {
  const { isLoading, canUse } = usePlan();
  const league = useQuery(api.leagues.getLeague, { leagueId });
  const updateConfig = useMutation(api.handicapConfig.updateHandicapConfig);

  const [handicapEnabled, setHandicapEnabled] = useState(false);
  const [handicapPercent, setHandicapPercent] = useState(100);
  const [handicapRecalcFrequency, setHandicapRecalcFrequency] = useState<
    "weekly" | "per-match" | "manual"
  >("weekly");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (league) {
      setHandicapEnabled(league.handicapEnabled);
      setHandicapPercent(league.handicapPercent ?? 100);
      setHandicapRecalcFrequency(
        (league as any).handicapRecalcFrequency ?? "weekly",
      );
    }
  }, [league]);

  if (isLoading) return null;
  if (!canUse("full_handicapping")) {
    return <UpgradePrompt message="Full handicap configuration requires a League plan or higher." />;
  }

  if (!league) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateConfig({
        leagueId,
        handicapEnabled,
        handicapPercent,
        handicapRecalcFrequency,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">
        Handicap Configuration
      </h2>
      <form onSubmit={handleSave} className="max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <input
            id="handicapEnabled"
            type="checkbox"
            checked={handicapEnabled}
            onChange={(e) => setHandicapEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-oche-600 bg-oche-800 text-amber-500 focus:ring-amber-500"
          />
          <label htmlFor="handicapEnabled" className="text-sm text-oche-300">
            Enable handicapping
          </label>
        </div>

        <div>
          <label
            htmlFor="handicapPercent"
            className="block text-sm font-medium text-oche-300"
          >
            Handicap percentage
          </label>
          <p className="mb-1 text-xs text-oche-500">
            Percentage of the average difference applied as spot runs (0–100)
          </p>
          <input
            id="handicapPercent"
            type="number"
            min={0}
            max={100}
            value={handicapPercent}
            onChange={(e) => setHandicapPercent(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="handicapRecalcFrequency"
            className="block text-sm font-medium text-oche-300"
          >
            Recalculation frequency
          </label>
          <select
            id="handicapRecalcFrequency"
            value={handicapRecalcFrequency}
            onChange={(e) =>
              setHandicapRecalcFrequency(
                e.target.value as "weekly" | "per-match" | "manual",
              )
            }
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="weekly">Weekly</option>
            <option value="per-match">Per match</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <p className="text-xs text-oche-500">
          Per-match and per-game handicap percentage overrides can be set on
          individual matches and games.
        </p>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>

        {saved && (
          <p className="text-sm text-green-400">Settings saved.</p>
        )}
      </form>
    </div>
  );
}
