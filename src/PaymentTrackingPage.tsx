// ABOUTME: Payment tracking page for league admins.
// ABOUTME: Shows player balances, payment status, record payment form, and payment history.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface PaymentTrackingPageProps {
  leagueId: Id<"leagues">;
}

export function PaymentTrackingPage({ leagueId }: PaymentTrackingPageProps) {
  const balances = useQuery(api.payments.getPlayerBalances, { leagueId });
  const payments = useQuery(api.payments.getPayments, { leagueId });
  const recordPayment = useMutation(api.payments.recordPayment);

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (balances === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setSaving(true);
    try {
      await recordPayment({
        leagueId,
        playerId: selectedPlayer as Id<"players">,
        amount,
        note,
      });
      setAmount(0);
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(value: number) {
    if (value < 0) return `-$${Math.abs(value).toFixed(2)}`;
    return `$${value.toFixed(2)}`;
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      paid: "bg-green-900 text-green-300",
      partial: "bg-yellow-900 text-yellow-300",
      unpaid: "bg-red-900 text-red-300",
    };
    return (
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-oche-100">Payment Tracking</h2>
        <Link
          to={`/leagues/${leagueId}/pay`}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
        >
          Pay Online
        </Link>
      </div>

      {/* Player Balances */}
      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-oche-200">
          Player Balances
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-oche-700 text-oche-400">
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 font-variant-numeric tabular-nums">
                  Owed
                </th>
                <th className="px-3 py-2 font-variant-numeric tabular-nums">
                  Paid
                </th>
                <th className="px-3 py-2 font-variant-numeric tabular-nums">
                  Balance
                </th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr
                  key={String(b.playerId)}
                  className="border-b border-oche-800 text-oche-200"
                >
                  <td className="px-3 py-2">{b.playerName}</td>
                  <td className="px-3 py-2">{b.teamName}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(b.totalOwed)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(b.totalPaid)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(b.balance)}
                  </td>
                  <td className="px-3 py-2">{statusBadge(b.status)}</td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-oche-500">
                    No players found. Add players to teams first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Payment Form */}
      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-oche-200">
          Record Payment
        </h3>
        <form onSubmit={handleRecord} className="max-w-lg space-y-4">
          <div>
            <label
              htmlFor="paymentPlayer"
              className="block text-sm font-medium text-oche-300"
            >
              Player
            </label>
            <select
              id="paymentPlayer"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select a player…</option>
              {balances.map((b) => (
                <option key={String(b.playerId)} value={String(b.playerId)}>
                  {b.playerName} ({b.teamName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="paymentAmount"
              className="block text-sm font-medium text-oche-300"
            >
              Amount
            </label>
            <input
              id="paymentAmount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="paymentNote"
              className="block text-sm font-medium text-oche-300"
            >
              Note
            </label>
            <input
              id="paymentNote"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Cash payment…"
              className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !selectedPlayer}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? "Recording…" : "Record Payment"}
          </button>
        </form>
      </section>

      {/* Payment History */}
      <section>
        <h3 className="mb-3 text-lg font-semibold text-oche-200">
          Payment History
        </h3>
        {payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-oche-700 text-oche-400">
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">Recorded By</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={String(p._id)}
                    className="border-b border-oche-800 text-oche-200"
                  >
                    <td className="px-3 py-2">{p.playerName}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-3 py-2">{p.note}</td>
                    <td className="px-3 py-2">{p.recordedByName}</td>
                    <td className="px-3 py-2">
                      {new Date(p.recordedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-oche-500">No payments recorded yet.</p>
        )}
      </section>
    </div>
  );
}
