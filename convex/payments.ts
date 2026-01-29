// ABOUTME: Payment tracking mutations and queries for league fee management.
// ABOUTME: Supports recording payments, viewing payment history, and computing player balances.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./authorization";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

export async function recordPaymentHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    playerId: Id<"players">;
    amount: number;
    note: string;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  if (args.amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  await ctx.db.insert("payments", {
    leagueId: args.leagueId,
    playerId: args.playerId,
    amount: args.amount,
    note: args.note,
    recordedBy: args.userId,
    recordedAt: Date.now(),
  });
}

export async function getPaymentsHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const payments = await ctx.db
    .query("payments")
    .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  const enriched = await Promise.all(
    payments.map(async (p) => {
      const player = await ctx.db.get(p.playerId);
      const user = player ? await ctx.db.get(player.userId) : null;
      const recorder = await ctx.db.get(p.recordedBy);
      return {
        _id: p._id,
        playerId: p.playerId,
        playerName: user?.name ?? "Unknown",
        amount: p.amount,
        note: p.note,
        recordedByName: recorder?.name ?? "Unknown",
        recordedAt: p.recordedAt,
      };
    }),
  );

  return enriched;
}

export async function getPlayerBalancesHandler(
  ctx: { db: DatabaseReader },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
  },
) {
  await requireRole(ctx.db, args.userId, args.leagueId, ["admin"]);

  const league = await ctx.db.get(args.leagueId);
  if (!league) throw new Error("League not found");

  const leagueFee = (league as any).leagueFee ?? 0;
  const weeklyFee = (league as any).weeklyFee ?? 0;
  const feeSchedule = (league as any).feeSchedule ?? "one-time";

  // Get all teams in league
  const teams = await ctx.db
    .query("teams")
    .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();
  const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));

  // Get all players on those teams
  const teamIds = new Set(teams.map((t) => t._id.toString()));
  const allPlayers = await ctx.db
    .query("players")
    .filter((q) =>
      q.or(...teams.map((t) => q.eq(q.field("teamId"), t._id))),
    )
    .collect();
  const leaguePlayers = allPlayers.filter((p) =>
    teamIds.has(p.teamId.toString()),
  );

  // Get all payments for this league
  const payments = await ctx.db
    .query("payments")
    .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
    .collect();

  // Group payments by player
  const paymentsByPlayer = new Map<string, number>();
  for (const p of payments) {
    const key = p.playerId.toString();
    paymentsByPlayer.set(key, (paymentsByPlayer.get(key) ?? 0) + p.amount);
  }

  // Compute total owed based on fee schedule
  // For one-time: leagueFee only
  // For weekly/per-match: leagueFee + weeklyFee (simplified — real weekly counting would need match/week tracking)
  const totalOwed = feeSchedule === "one-time" ? leagueFee : leagueFee + weeklyFee;

  const balances = await Promise.all(
    leaguePlayers.map(async (player) => {
      const user = await ctx.db.get(player.userId);
      const team = teamMap.get(player.teamId.toString());
      const totalPaid = paymentsByPlayer.get(player._id.toString()) ?? 0;
      const balance = totalPaid - totalOwed;

      let status: "paid" | "partial" | "unpaid";
      if (totalPaid >= totalOwed) {
        status = "paid";
      } else if (totalPaid > 0) {
        status = "partial";
      } else {
        status = "unpaid";
      }

      return {
        playerId: player._id,
        playerName: user?.name ?? "Unknown",
        teamName: team?.name ?? "Unknown",
        totalPaid,
        totalOwed,
        balance: totalPaid >= totalOwed ? 0 : balance,
        status,
      };
    }),
  );

  return balances;
}

export const recordPayment = mutation({
  args: {
    leagueId: v.id("leagues"),
    playerId: v.id("players"),
    amount: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await recordPaymentHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getPayments = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getPaymentsHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});

export const getPlayerBalances = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getPlayerBalancesHandler(ctx, {
      leagueId: args.leagueId,
      userId: userId as Id<"users">,
    });
  },
});
