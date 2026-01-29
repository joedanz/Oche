// ABOUTME: Plan-based feature gating and limit enforcement for mutations/queries.
// ABOUTME: Looks up user subscription and checks access against plan configuration.

import type { DatabaseReader } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { hasFeature, checkLimit, type PlanId, type Feature, type PlanLimits } from "./plans";

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function getUserPlanId(
  db: DatabaseReader,
  userId: Id<"users">,
): Promise<PlanId> {
  const subscription = await db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!subscription) return "starter";
  if (subscription.status === "canceled") return "starter";

  return subscription.planId as PlanId;
}

export async function requireFeature(
  db: DatabaseReader,
  userId: Id<"users">,
  feature: Feature,
): Promise<void> {
  const planId = await getUserPlanId(db, userId);
  if (!hasFeature(planId, feature)) {
    throw new PlanLimitError(
      `This feature requires a paid plan. Please upgrade to access it.`,
    );
  }
}

export async function requireLimit(
  db: DatabaseReader,
  userId: Id<"users">,
  limitKey: keyof PlanLimits,
  currentCount: number,
): Promise<void> {
  const planId = await getUserPlanId(db, userId);
  if (!checkLimit(planId, limitKey, currentCount)) {
    throw new PlanLimitError(
      `You've reached your plan limit. Please upgrade to increase your limit.`,
    );
  }
}
