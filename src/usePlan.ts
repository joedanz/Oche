// ABOUTME: React hook for accessing the current user's subscription plan.
// ABOUTME: Provides plan ID, feature checks, and limit checks for frontend gating.

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { PLANS, hasFeature, checkLimit, type PlanId, type Feature, type PlanLimits } from "../convex/plans";

export function usePlan() {
  const subscription = useQuery(api.subscriptions.mySubscription);

  const planId: PlanId = subscription?.planId ?? "starter";
  const plan = PLANS[planId];

  return {
    isLoading: subscription === undefined,
    planId,
    plan,
    isPaid: planId !== "starter",
    canUse: (feature: Feature) => hasFeature(planId, feature),
    withinLimit: (limitKey: keyof PlanLimits, currentCount: number) =>
      checkLimit(planId, limitKey, currentCount),
  };
}
