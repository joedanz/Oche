// ABOUTME: Audit log for tracking score changes, imports, and role changes.
// ABOUTME: Provides immutable, filterable log entries scoped per league.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { requireRole } from "./authorization";
import { requireFeature } from "./planGating";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

const auditAction = v.union(
  v.literal("score_entry"),
  v.literal("score_edit"),
  v.literal("score_import"),
  v.literal("role_change"),
);

type AuditAction = "score_entry" | "score_edit" | "score_import" | "role_change";

export async function createAuditLogEntryHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    action: AuditAction;
    details: string;
    oldValue?: string;
    newValue?: string;
  },
) {
  await ctx.db.insert("auditLog", {
    leagueId: args.leagueId,
    userId: args.userId,
    action: args.action,
    details: args.details,
    oldValue: args.oldValue,
    newValue: args.newValue,
    createdAt: Date.now(),
  });
}

export async function getAuditLogHandler(
  ctx: { db: DatabaseReader & { get: (id: any) => Promise<any> } },
  args: {
    leagueId: Id<"leagues">;
    action?: AuditAction;
  },
) {
  let entries = await ctx.db
    .query("auditLog")
    .withIndex("by_league", (q: any) => q.eq("leagueId", args.leagueId))
    .order("desc")
    .collect();

  if (args.action) {
    entries = entries.filter((e: any) => e.action === args.action);
  }

  const enriched = await Promise.all(
    entries.map(async (entry: any) => {
      const user = await ctx.db.get(entry.userId);
      return {
        ...entry,
        userName: user?.name ?? user?.email ?? "Unknown",
      };
    }),
  );

  return enriched;
}

export const createAuditLogEntry = mutation({
  args: {
    leagueId: v.id("leagues"),
    action: auditAction,
    details: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await createAuditLogEntryHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getAuditLog = query({
  args: {
    leagueId: v.id("leagues"),
    action: v.optional(auditAction),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await requireRole(ctx.db, userId as Id<"users">, args.leagueId, ["admin"]);
    await requireFeature(ctx.db, userId as Id<"users">, "audit_log");
    return getAuditLogHandler(ctx as any, args);
  },
});
