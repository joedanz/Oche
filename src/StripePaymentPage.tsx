// ABOUTME: Stripe online payment page for league fee checkout.
// ABOUTME: Shows outstanding balances with pay buttons that redirect to Stripe Checkout.

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface StripePaymentPageProps {
  leagueId: Id<"leagues">;
}

export function StripePaymentPage({ leagueId }: StripePaymentPageProps) {
  const balances = useQuery(api.payments.getPlayerBalances, { leagueId });
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const [searchParams] = useSearchParams();
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  if (balances === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handlePay(playerId: string) {
    setLoadingPlayer(playerId);
    try {
      const result = await createCheckout({
        leagueId,
        playerId: playerId as Id<"players">,
      });
      window.location.href = result.url;
    } catch (err) {
      console.error("Checkout error:", err);
      setLoadingPlayer(null);
    }
  }

  function formatCurrency(value: number) {
    if (value < 0) return `-$${Math.abs(value).toFixed(2)}`;
    return `$${value.toFixed(2)}`;
  }

  const unpaid = balances.filter((b) => b.status !== "paid");

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">Pay Online</h2>

      {success && (
        <div className="mb-6 rounded-md border border-green-700 bg-green-900/50 px-4 py-3 text-green-300">
          Payment successful! Your balance will update shortly.
        </div>
      )}

      {canceled && (
        <div className="mb-6 rounded-md border border-yellow-700 bg-yellow-900/50 px-4 py-3 text-yellow-300">
          Payment was canceled. You can try again below.
        </div>
      )}

      {unpaid.length === 0 ? (
        <p className="text-oche-400">
          All players are fully paid. No outstanding balances.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-oche-700 text-oche-400">
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 tabular-nums">Owed</th>
                <th className="px-3 py-2 tabular-nums">Paid</th>
                <th className="px-3 py-2 tabular-nums">Balance</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map((b) => (
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
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        b.status === "partial"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handlePay(String(b.playerId))}
                      disabled={loadingPlayer === String(b.playerId)}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                    >
                      {loadingPlayer === String(b.playerId)
                        ? "Redirecting…"
                        : `Pay ${formatCurrency(b.totalOwed - b.totalPaid)}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
