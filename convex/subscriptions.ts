// ABOUTME: Subscription lifecycle management for paid plan billing.
// ABOUTME: Handles checkout session creation, webhook events, and subscription CRUD.

import { action, internalMutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";
import type { PlanId } from "./plans";

export function buildSubscriptionCheckoutMetadata(args: {
  userId: string;
  planId: string;
  billingInterval: string;
}): Record<string, string> {
  return {
    userId: args.userId,
    planId: args.planId,
    billingInterval: args.billingInterval,
  };
}

export type SubscriptionEvent =
  | {
      type: "checkout_completed";
      userId: Id<"users">;
      planId: PlanId;
      billingInterval: "monthly" | "yearly";
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      currentPeriodEnd: number;
    }
  | {
      type: "subscription_updated";
      stripeSubscriptionId: string;
      status: "active" | "past_due";
      currentPeriodEnd: number;
    }
  | {
      type: "subscription_deleted";
      stripeSubscriptionId: string;
    };

export async function processSubscriptionEvent(
  ctx: { db: DatabaseWriter },
  event: SubscriptionEvent,
): Promise<void> {
  if (event.type === "checkout_completed") {
    // Remove any existing subscription for this user
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", event.userId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("subscriptions", {
      userId: event.userId,
      planId: event.planId,
      billingInterval: event.billingInterval,
      status: "active",
      stripeCustomerId: event.stripeCustomerId,
      stripeSubscriptionId: event.stripeSubscriptionId,
      currentPeriodEnd: event.currentPeriodEnd,
      createdAt: Date.now(),
    });
    return;
  }

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", event.stripeSubscriptionId),
    )
    .unique();

  if (!subscription) return;

  if (event.type === "subscription_updated") {
    await ctx.db.patch(subscription._id, {
      status: event.status,
      currentPeriodEnd: event.currentPeriodEnd,
    });
  } else if (event.type === "subscription_deleted") {
    await ctx.db.patch(subscription._id, {
      status: "canceled",
    });
  }
}

// Convex action: create a Stripe subscription checkout session
export const createSubscriptionCheckout = action({
  args: {
    planId: v.union(v.literal("league"), v.literal("association")),
    billingInterval: v.union(v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const priceId = getPriceId(args.planId, args.billingInterval);
    if (!priceId) {
      throw new Error(`No Stripe price configured for ${args.planId}/${args.billingInterval}`);
    }

    const metadata = buildSubscriptionCheckoutMetadata({
      userId: userId as string,
      planId: args.planId,
      billingInterval: args.billingInterval,
    });

    const baseUrl = process.env.SITE_URL ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      metadata,
      subscription_data: { metadata },
      success_url: `${baseUrl}/billing?success=true`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    return { url: session.url };
  },
});

// Convex action: create a Stripe billing portal session
export const createBillingPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sub = await ctx.runQuery(internal.subscriptions.getSubscriptionByUser, {
      userId: userId as string,
    });

    if (!sub?.stripeCustomerId) {
      throw new Error("No active subscription found");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const baseUrl = process.env.SITE_URL ?? "http://localhost:5173";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/billing`,
    });

    return { url: session.url };
  },
});

// Internal query: get subscription by user ID
export const getSubscriptionByUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .unique();
  },
});

// Public query: get current user's subscription
export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .unique();

    if (!sub) return { planId: "starter" as PlanId, status: "active" as const };

    return {
      planId: sub.planId as PlanId,
      status: sub.status,
      billingInterval: sub.billingInterval,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  },
});

// Internal mutation: process subscription webhook event
export const handleSubscriptionWebhook = internalMutation({
  args: {
    eventType: v.string(),
    userId: v.optional(v.string()),
    planId: v.optional(v.string()),
    billingInterval: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.eventType === "checkout_completed") {
      await processSubscriptionEvent(ctx, {
        type: "checkout_completed",
        userId: args.userId! as Id<"users">,
        planId: args.planId! as PlanId,
        billingInterval: args.billingInterval! as "monthly" | "yearly",
        stripeCustomerId: args.stripeCustomerId!,
        stripeSubscriptionId: args.stripeSubscriptionId!,
        currentPeriodEnd: args.currentPeriodEnd!,
      });
    } else if (args.eventType === "subscription_updated") {
      await processSubscriptionEvent(ctx, {
        type: "subscription_updated",
        stripeSubscriptionId: args.stripeSubscriptionId!,
        status: args.status! as "active" | "past_due",
        currentPeriodEnd: args.currentPeriodEnd!,
      });
    } else if (args.eventType === "subscription_deleted") {
      await processSubscriptionEvent(ctx, {
        type: "subscription_deleted",
        stripeSubscriptionId: args.stripeSubscriptionId!,
      });
    }
  },
});

function getPriceId(planId: string, interval: string): string | null {
  const key = `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key] ?? null;
}
