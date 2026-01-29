// ABOUTME: Stripe payment integration for online league fee payments.
// ABOUTME: Provides checkout session creation, webhook handling, and payment recording.

import { action, internalMutation, internalQuery, httpAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { DatabaseWriter } from "./_generated/server";

// Pure function: build Stripe checkout metadata
export function buildCheckoutMetadata(args: {
  leagueId: string;
  playerId: string;
  amount: number;
  leagueName: string;
  playerName: string;
}): Record<string, string> {
  return {
    leagueId: args.leagueId,
    playerId: args.playerId,
    amount: String(args.amount),
    leagueName: args.leagueName,
    playerName: args.playerName,
  };
}

// Pure function: extract payment data from Stripe webhook event
export function validateWebhookPayload(
  event: any,
): {
  sessionId: string;
  amountCents: number;
  leagueId: string;
  playerId: string;
} | null {
  if (event.type !== "checkout.session.completed") {
    return null;
  }

  const session = event.data?.object;
  if (!session) return null;

  const { leagueId, playerId } = session.metadata ?? {};
  if (!leagueId || !playerId) return null;

  return {
    sessionId: session.id,
    amountCents: session.amount_total,
    leagueId,
    playerId,
  };
}

// Testable function: record a Stripe payment in the database
export async function processStripePayment(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    playerId: Id<"players">;
    amount: number;
    stripeSessionId: string;
  },
) {
  await ctx.db.insert("payments", {
    leagueId: args.leagueId,
    playerId: args.playerId,
    amount: args.amount,
    note: `Stripe payment (${args.stripeSessionId})`,
    recordedBy: args.playerId as unknown as Id<"users">,
    recordedAt: Date.now(),
  });
}

// Convex action: create a Stripe Checkout session
export const createCheckoutSession = action({
  args: {
    leagueId: v.id("leagues"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    // Fetch league and player info for checkout description
    const league = await ctx.runQuery(internal.stripe.getLeagueInfo, {
      leagueId: args.leagueId,
    });
    const player = await ctx.runQuery(internal.stripe.getPlayerInfo, {
      playerId: args.playerId,
    });

    const amount = league.totalOwed;
    if (amount <= 0) {
      throw new Error("No outstanding balance");
    }

    const amountCents = Math.round(amount * 100);

    const metadata = buildCheckoutMetadata({
      leagueId: args.leagueId,
      playerId: args.playerId,
      amount: amountCents,
      leagueName: league.name,
      playerName: player.name,
    });

    const baseUrl = process.env.SITE_URL ?? "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${league.name} — League Fee`,
              description: `Payment for ${player.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata,
      success_url: `${baseUrl}/leagues/${args.leagueId}/pay?success=true`,
      cancel_url: `${baseUrl}/leagues/${args.leagueId}/pay?canceled=true`,
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    return { url: session.url };
  },
});

// Internal query: get league info for checkout
export const getLeagueInfo = internalQuery({
  args: { leagueId: v.id("leagues") },
  handler: async (ctx, args) => {
    const league = await ctx.db.get(args.leagueId);
    if (!league) throw new Error("League not found");
    const leagueFee = (league as any).leagueFee ?? 0;
    const weeklyFee = (league as any).weeklyFee ?? 0;
    const feeSchedule = (league as any).feeSchedule ?? "one-time";
    const totalOwed =
      feeSchedule === "one-time" ? leagueFee : leagueFee + weeklyFee;
    return { name: league.name, totalOwed };
  },
});

// Internal query: get player info for checkout
export const getPlayerInfo = internalQuery({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");
    const user = await ctx.db.get(player.userId);
    return { name: user?.name ?? "Unknown" };
  },
});

// Internal mutation: record payment from webhook
export const recordStripePayment = internalMutation({
  args: {
    leagueId: v.string(),
    playerId: v.string(),
    amount: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await processStripePayment(ctx, {
      leagueId: args.leagueId as Id<"leagues">,
      playerId: args.playerId as Id<"players">,
      amount: args.amount,
      stripeSessionId: args.stripeSessionId,
    });
  },
});

// HTTP action: Stripe webhook endpoint
export const stripeWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();

  let event: any;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    // Development mode: parse body directly (no signature verification)
    event = JSON.parse(body);
  }

  const paymentData = validateWebhookPayload(event);
  if (paymentData) {
    const amountDollars = paymentData.amountCents / 100;
    await ctx.runMutation(internal.stripe.recordStripePayment, {
      leagueId: paymentData.leagueId,
      playerId: paymentData.playerId,
      amount: amountDollars,
      stripeSessionId: paymentData.sessionId,
    });
  }

  return new Response("OK", { status: 200 });
});
