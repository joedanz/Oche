// ABOUTME: Billing management page for viewing and changing subscription plans.
// ABOUTME: Shows current plan, upgrade options, and links to Stripe billing portal.

import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { PLANS, type PlanId } from "../convex/plans";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

const PLAN_ORDER: PlanId[] = ["starter", "league", "association"];

export function BillingPage() {
  const subscription = useQuery(api.subscriptions.mySubscription);
  const createCheckout = useAction(api.subscriptions.createSubscriptionCheckout);
  const createPortal = useAction(api.subscriptions.createBillingPortalSession);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  if (subscription === undefined || subscription === null) {
    return <p className="text-oche-400">Loading…</p>;
  }

  const currentPlanId = subscription.planId;
  const currentPlan = PLANS[currentPlanId];
  const isPaid = currentPlanId !== "starter";

  async function handleUpgrade(planId: "league" | "association", interval: "monthly" | "yearly") {
    setLoading(`${planId}-${interval}`);
    try {
      const { url } = await createCheckout({ planId, billingInterval: interval });
      window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const { url } = await createPortal({});
      window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-oche-100">Billing</h1>
      <p className="mb-8 text-oche-400">Manage your Oche subscription</p>

      {searchParams.get("success") === "true" && (
        <div className="mb-6 rounded-md border border-green-700 bg-green-900/30 px-4 py-3 text-green-300">
          Subscription activated! Welcome to Oche {currentPlan.name}.
        </div>
      )}

      {searchParams.get("canceled") === "true" && (
        <div className="mb-6 rounded-md border border-amber-700 bg-amber-900/30 px-4 py-3 text-amber-300">
          Checkout canceled. Your plan was not changed.
        </div>
      )}

      {/* Current plan card */}
      <div className="mb-8 rounded-lg border border-oche-700 bg-oche-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-oche-100">
              {currentPlan.name} Plan
            </h2>
            <p className="text-oche-400">
              {isPaid
                ? `$${currentPlan.monthlyPriceCents / 100}/mo`
                : "Free"}
              {subscription.billingInterval === "yearly" &&
                ` (billed yearly at $${currentPlan.yearlyPriceCents / 100}/yr)`}
            </p>
            {subscription.status === "past_due" && (
              <p className="mt-1 text-sm font-medium text-red-400">
                Payment past due — please update your payment method
              </p>
            )}
            {subscription.currentPeriodEnd && (
              <p className="mt-1 text-sm text-oche-500">
                Renews{" "}
                {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPaid && (
            <button
              onClick={handleManage}
              disabled={loading === "portal"}
              className="rounded-md border border-oche-600 px-4 py-2 text-sm text-oche-300 transition hover:border-oche-500 hover:text-oche-100 disabled:opacity-50"
            >
              {loading === "portal" ? "Opening…" : "Manage Subscription"}
            </button>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <h2 className="mb-4 text-xl font-semibold text-oche-100">
        {isPaid ? "All Plans" : "Upgrade Your Plan"}
      </h2>

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlanId;
          const isUpgrade =
            PLAN_ORDER.indexOf(planId) > PLAN_ORDER.indexOf(currentPlanId);

          return (
            <div
              key={planId}
              className={`rounded-lg border p-6 ${
                isCurrent
                  ? "border-amber-500 bg-oche-800"
                  : "border-oche-700 bg-oche-800"
              }`}
            >
              <h3 className="text-lg font-semibold text-oche-100">
                {plan.name}
              </h3>
              <p className="mb-4 text-2xl font-bold text-oche-100">
                {plan.monthlyPriceCents === 0
                  ? "Free"
                  : `$${plan.monthlyPriceCents / 100}`}
                {plan.monthlyPriceCents > 0 && (
                  <span className="text-sm font-normal text-oche-400">
                    /mo
                  </span>
                )}
              </p>

              <ul className="mb-6 space-y-2 text-sm text-oche-300">
                <li>
                  {plan.limits.maxLeagues === Infinity
                    ? "Unlimited"
                    : plan.limits.maxLeagues}{" "}
                  league{plan.limits.maxLeagues !== 1 ? "s" : ""}
                </li>
                <li>
                  {plan.limits.maxTeamsPerLeague === Infinity
                    ? "Unlimited"
                    : `Up to ${plan.limits.maxTeamsPerLeague}`}{" "}
                  teams/league
                </li>
                <li>
                  {plan.limits.maxActiveSeasons === Infinity
                    ? "Unlimited"
                    : plan.limits.maxActiveSeasons}{" "}
                  active season{plan.limits.maxActiveSeasons !== 1 ? "s" : ""}
                </li>
                {plan.features.has("tournaments") && <li>Tournaments</li>}
                {plan.features.has("score_import") && <li>Score import</li>}
                {plan.features.has("csv_pdf_export") && <li>CSV/PDF export</li>}
                {plan.features.has("historical_trends") && (
                  <li>Historical trends</li>
                )}
                {plan.features.has("public_pages") && <li>Public pages</li>}
                {plan.features.has("audit_log") && <li>Audit log</li>}
                {plan.features.has("cross_league_stats") && (
                  <li>Cross-league stats</li>
                )}
                {plan.features.has("custom_branding") && (
                  <li>Custom branding</li>
                )}
              </ul>

              {isCurrent ? (
                <div className="rounded-md bg-amber-600/20 px-4 py-2 text-center text-sm font-medium text-amber-400">
                  Current Plan
                </div>
              ) : isUpgrade ? (
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      handleUpgrade(
                        planId as "league" | "association",
                        "monthly",
                      )
                    }
                    disabled={loading !== null}
                    className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                  >
                    {loading === `${planId}-monthly`
                      ? "Redirecting…"
                      : `Upgrade to ${plan.name}`}
                  </button>
                  {plan.yearlyPriceCents > 0 && (
                    <button
                      onClick={() =>
                        handleUpgrade(
                          planId as "league" | "association",
                          "yearly",
                        )
                      }
                      disabled={loading !== null}
                      className="w-full rounded-md border border-oche-600 px-4 py-2 text-sm text-oche-300 transition hover:border-oche-500 disabled:opacity-50"
                    >
                      {loading === `${planId}-yearly`
                        ? "Redirecting…"
                        : `$${plan.yearlyPriceCents / 100}/yr (save ${Math.round((1 - plan.yearlyPriceCents / (plan.monthlyPriceCents * 12)) * 100)}%)`}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Link
          to="/dashboard"
          className="text-sm text-oche-400 transition hover:text-oche-300"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
