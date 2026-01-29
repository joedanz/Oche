// ABOUTME: Match configuration settings page for league admins.
// ABOUTME: Allows configuring games per match, points, bonus, extras, and blind rules.

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface MatchConfigPageProps {
  leagueId: Id<"leagues">;
}

export function MatchConfigPage({ leagueId }: MatchConfigPageProps) {
  const league = useQuery(api.leagues.getLeague, { leagueId });
  const updateConfig = useMutation(api.matchConfig.updateMatchConfig);

  const [gamesPerMatch, setGamesPerMatch] = useState(5);
  const [pointsPerGameWin, setPointsPerGameWin] = useState(1);
  const [bonusForTotal, setBonusForTotal] = useState(true);
  const [extraExclude, setExtraExclude] = useState(true);
  const [blindEnabled, setBlindEnabled] = useState(false);
  const [blindDefaultRuns, setBlindDefaultRuns] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (league?.matchConfig) {
      setGamesPerMatch(league.matchConfig.gamesPerMatch);
      setPointsPerGameWin(league.matchConfig.pointsPerGameWin);
      setBonusForTotal(league.matchConfig.bonusForTotal);
      setExtraExclude(league.matchConfig.extraExclude);
      setBlindEnabled(league.matchConfig.blindRules.enabled);
      setBlindDefaultRuns(league.matchConfig.blindRules.defaultRuns);
    }
  }, [league]);

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
        gamesPerMatch,
        pointsPerGameWin,
        bonusForTotal,
        extraExclude,
        blindEnabled,
        blindDefaultRuns,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">
        Match Configuration
      </h2>
      <form onSubmit={handleSave} className="max-w-lg space-y-6">
        <div>
          <label
            htmlFor="gamesPerMatch"
            className="block text-sm font-medium text-oche-300"
          >
            Games per match
          </label>
          <input
            id="gamesPerMatch"
            type="number"
            min={1}
            max={10}
            value={gamesPerMatch}
            onChange={(e) => setGamesPerMatch(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="pointsPerGameWin"
            className="block text-sm font-medium text-oche-300"
          >
            Points per game win
          </label>
          <input
            id="pointsPerGameWin"
            type="number"
            min={1}
            value={pointsPerGameWin}
            onChange={(e) => setPointsPerGameWin(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="bonusForTotal"
            type="checkbox"
            checked={bonusForTotal}
            onChange={(e) => setBonusForTotal(e.target.checked)}
            className="h-4 w-4 rounded border-oche-600 bg-oche-800 text-amber-500 focus:ring-amber-500"
          />
          <label htmlFor="bonusForTotal" className="text-sm text-oche-300">
            Bonus point for highest total
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="extraExclude"
            type="checkbox"
            checked={extraExclude}
            onChange={(e) => setExtraExclude(e.target.checked)}
            className="h-4 w-4 rounded border-oche-600 bg-oche-800 text-amber-500 focus:ring-amber-500"
          />
          <label htmlFor="extraExclude" className="text-sm text-oche-300">
            Extra innings runs excluded from stats
          </label>
        </div>

        <fieldset className="space-y-3 rounded-md border border-oche-700 p-4">
          <legend className="px-2 text-sm font-medium text-oche-300">
            Blind Rules
          </legend>

          <div className="flex items-center gap-3">
            <input
              id="blindEnabled"
              type="checkbox"
              checked={blindEnabled}
              onChange={(e) => setBlindEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-oche-600 bg-oche-800 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="blindEnabled" className="text-sm text-oche-300">
              Blinds enabled
            </label>
          </div>

          <div>
            <label
              htmlFor="blindDefaultRuns"
              className="block text-sm font-medium text-oche-300"
            >
              Blind default runs
            </label>
            <input
              id="blindDefaultRuns"
              type="number"
              min={0}
              max={9}
              value={blindDefaultRuns}
              onChange={(e) => setBlindDefaultRuns(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </fieldset>

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
