// ABOUTME: Notification system for league events.
// ABOUTME: Handles creating, reading, and managing notifications and user preferences.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";

const notificationCategory = v.union(
  v.literal("match_schedule"),
  v.literal("score_deadline"),
  v.literal("roster_change"),
);

type NotificationCategory = "match_schedule" | "score_deadline" | "roster_change";

export async function createNotificationHandler(
  ctx: { db: DatabaseWriter },
  args: {
    leagueId: Id<"leagues">;
    userId: Id<"users">;
    category: NotificationCategory;
    title: string;
    message: string;
  },
) {
  await ctx.db.insert("notifications", {
    leagueId: args.leagueId,
    userId: args.userId,
    category: args.category,
    title: args.title,
    message: args.message,
    isRead: false,
    createdAt: Date.now(),
  });
}

export async function getNotificationsHandler(
  ctx: { db: DatabaseReader },
  args: {
    userId: Id<"users">;
    leagueId: Id<"leagues">;
  },
) {
  const all = await ctx.db
    .query("notifications")
    .withIndex("by_user_league", (q: any) =>
      q.eq("userId", args.userId).eq("leagueId", args.leagueId),
    )
    .collect();

  return all.sort((a: any, b: any) => b.createdAt - a.createdAt);
}

export async function markReadHandler(
  ctx: { db: DatabaseWriter },
  args: {
    notificationId: Id<"notifications">;
    userId: Id<"users">;
    isRead: boolean;
  },
) {
  const notification = await ctx.db.get(args.notificationId);
  if (!notification) throw new Error("Notification not found");
  if (notification.userId !== args.userId) {
    throw new Error("Cannot modify another user's notification");
  }
  await ctx.db.patch(args.notificationId, { isRead: args.isRead });
}

export async function getPreferencesHandler(
  ctx: { db: DatabaseReader },
  args: {
    userId: Id<"users">;
    leagueId: Id<"leagues">;
  },
) {
  const prefs = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_user_league", (q: any) =>
      q.eq("userId", args.userId).eq("leagueId", args.leagueId),
    )
    .unique();

  if (!prefs) {
    return {
      matchSchedule: true,
      scoreDeadline: true,
      rosterChange: true,
    };
  }

  return {
    matchSchedule: prefs.matchSchedule,
    scoreDeadline: prefs.scoreDeadline,
    rosterChange: prefs.rosterChange,
  };
}

export async function updatePreferencesHandler(
  ctx: { db: DatabaseWriter },
  args: {
    userId: Id<"users">;
    leagueId: Id<"leagues">;
    matchSchedule: boolean;
    scoreDeadline: boolean;
    rosterChange: boolean;
  },
) {
  const existing = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_user_league", (q: any) =>
      q.eq("userId", args.userId).eq("leagueId", args.leagueId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      matchSchedule: args.matchSchedule,
      scoreDeadline: args.scoreDeadline,
      rosterChange: args.rosterChange,
    });
  } else {
    await ctx.db.insert("notificationPreferences", {
      userId: args.userId,
      leagueId: args.leagueId,
      matchSchedule: args.matchSchedule,
      scoreDeadline: args.scoreDeadline,
      rosterChange: args.rosterChange,
    });
  }
}

// Convex wrappers

export const createNotification = mutation({
  args: {
    leagueId: v.id("leagues"),
    userId: v.id("users"),
    category: notificationCategory,
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await auth.getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    await createNotificationHandler(ctx, args);
  },
});

export const getNotifications = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getNotificationsHandler(ctx, {
      userId: userId as Id<"users">,
      leagueId: args.leagueId,
    });
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await markReadHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});

export const getPreferences = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return getPreferencesHandler(ctx, {
      userId: userId as Id<"users">,
      leagueId: args.leagueId,
    });
  },
});

export const updatePreferences = mutation({
  args: {
    leagueId: v.id("leagues"),
    matchSchedule: v.boolean(),
    scoreDeadline: v.boolean(),
    rosterChange: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await updatePreferencesHandler(ctx, {
      ...args,
      userId: userId as Id<"users">,
    });
  },
});
