// ABOUTME: Payment configuration settings page for league admins.
// ABOUTME: Allows setting league fee, weekly fee, and fee schedule.

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface PaymentConfigPageProps {
  leagueId: Id<"leagues">;
}

export function PaymentConfigPage({ leagueId }: PaymentConfigPageProps) {
  const league = useQuery(api.leagues.getLeague, { leagueId });
  const updateConfig = useMutation(api.paymentConfig.updatePaymentConfig);

  const [leagueFee, setLeagueFee] = useState(0);
  const [weeklyFee, setWeeklyFee] = useState(0);
  const [feeSchedule, setFeeSchedule] = useState<
    "one-time" | "weekly" | "per-match"
  >("weekly");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (league) {
      setLeagueFee((league as any).leagueFee ?? 0);
      setWeeklyFee((league as any).weeklyFee ?? 0);
      setFeeSchedule((league as any).feeSchedule ?? "weekly");
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
        leagueFee,
        weeklyFee,
        feeSchedule,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">
        Payment Configuration
      </h2>
      <form onSubmit={handleSave} className="max-w-lg space-y-6">
        <div>
          <label
            htmlFor="leagueFee"
            className="block text-sm font-medium text-oche-300"
          >
            League fee
          </label>
          <p className="mb-1 text-xs text-oche-500">
            One-time or seasonal league registration fee amount
          </p>
          <input
            id="leagueFee"
            type="number"
            min={0}
            step="0.01"
            value={leagueFee}
            onChange={(e) => setLeagueFee(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="weeklyFee"
            className="block text-sm font-medium text-oche-300"
          >
            Weekly fee
          </label>
          <p className="mb-1 text-xs text-oche-500">
            Recurring fee charged each week or per match
          </p>
          <input
            id="weeklyFee"
            type="number"
            min={0}
            step="0.01"
            value={weeklyFee}
            onChange={(e) => setWeeklyFee(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="feeSchedule"
            className="block text-sm font-medium text-oche-300"
          >
            Fee schedule
          </label>
          <select
            id="feeSchedule"
            value={feeSchedule}
            onChange={(e) =>
              setFeeSchedule(
                e.target.value as "one-time" | "weekly" | "per-match",
              )
            }
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="one-time">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="per-match">Per match</option>
          </select>
        </div>

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
