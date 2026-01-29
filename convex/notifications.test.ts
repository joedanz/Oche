// ABOUTME: Tests for the notifications backend module.
// ABOUTME: Verifies notification creation, retrieval, read/unread toggling, and preference management.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("notifications", () => {
  let mockCtx: any;
  let insertedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];
    mockCtx = {
      db: {
        get: vi.fn(),
        insert: vi.fn(async (_table: string, doc: any) => {
          insertedDocs.push(doc);
          return "notif-" + insertedDocs.length;
        }),
        patch: vi.fn(),
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
            unique: vi.fn().mockResolvedValue({
              _id: "m1",
              userId: "user-1",
              leagueId: "league-1",
              role: "admin",
            }),
          }),
        }),
      },
    };
  });

  describe("createNotificationHandler", () => {
    it("creates a notification with all required fields", async () => {
      const { createNotificationHandler } = await import("./notifications");

      await createNotificationHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        category: "match_schedule",
        title: "Upcoming Match",
        message: "You have a match tomorrow",
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "notifications",
        expect.objectContaining({
          leagueId: "league-1",
          userId: "user-1",
          category: "match_schedule",
          title: "Upcoming Match",
          message: "You have a match tomorrow",
          isRead: false,
        }),
      );
    });

    it("sets createdAt timestamp", async () => {
      const { createNotificationHandler } = await import("./notifications");

      await createNotificationHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        category: "score_deadline",
        title: "Score Due",
        message: "Submit scores by Friday",
      });

      expect(insertedDocs[0]).toHaveProperty("createdAt");
      expect(typeof insertedDocs[0].createdAt).toBe("number");
    });
  });

  describe("getNotificationsHandler", () => {
    it("returns notifications for a user in a league", async () => {
      const notifications = [
        {
          _id: "n1",
          leagueId: "league-1",
          userId: "user-1",
          category: "match_schedule",
          title: "Match Tomorrow",
          message: "You play at 7pm",
          isRead: false,
          createdAt: 1000,
        },
        {
          _id: "n2",
          leagueId: "league-1",
          userId: "user-1",
          category: "roster_change",
          title: "New Player",
          message: "Bob joined your team",
          isRead: true,
          createdAt: 900,
        },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(notifications),
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "player",
          }),
        }),
      });

      const { getNotificationsHandler } = await import("./notifications");

      const result = await getNotificationsHandler(mockCtx, {
        userId: "user-1" as any,
        leagueId: "league-1" as any,
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Match Tomorrow");
    });
  });

  describe("markReadHandler", () => {
    it("marks a notification as read", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "n1",
        userId: "user-1",
        isRead: false,
      });

      const { markReadHandler } = await import("./notifications");

      await markReadHandler(mockCtx, {
        notificationId: "n1" as any,
        userId: "user-1" as any,
        isRead: true,
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("n1", { isRead: true });
    });

    it("marks a notification as unread", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "n1",
        userId: "user-1",
        isRead: true,
      });

      const { markReadHandler } = await import("./notifications");

      await markReadHandler(mockCtx, {
        notificationId: "n1" as any,
        userId: "user-1" as any,
        isRead: false,
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("n1", { isRead: false });
    });

    it("rejects marking someone else's notification", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "n1",
        userId: "user-2",
        isRead: false,
      });

      const { markReadHandler } = await import("./notifications");

      await expect(
        markReadHandler(mockCtx, {
          notificationId: "n1" as any,
          userId: "user-1" as any,
          isRead: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getPreferencesHandler", () => {
    it("returns default preferences when none exist", async () => {
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(null),
          collect: vi.fn().mockResolvedValue([]),
        }),
      });

      const { getPreferencesHandler } = await import("./notifications");

      const result = await getPreferencesHandler(mockCtx, {
        userId: "user-1" as any,
        leagueId: "league-1" as any,
      });

      expect(result.matchSchedule).toBe(true);
      expect(result.scoreDeadline).toBe(true);
      expect(result.rosterChange).toBe(true);
    });
  });

  describe("updatePreferencesHandler", () => {
    it("creates preferences if none exist", async () => {
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(null),
          collect: vi.fn().mockResolvedValue([]),
        }),
      });

      const { updatePreferencesHandler } = await import("./notifications");

      await updatePreferencesHandler(mockCtx, {
        userId: "user-1" as any,
        leagueId: "league-1" as any,
        matchSchedule: true,
        scoreDeadline: false,
        rosterChange: true,
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "notificationPreferences",
        expect.objectContaining({
          userId: "user-1",
          leagueId: "league-1",
          matchSchedule: true,
          scoreDeadline: false,
          rosterChange: true,
        }),
      );
    });

    it("updates existing preferences", async () => {
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "pref-1",
            userId: "user-1",
            leagueId: "league-1",
            matchSchedule: true,
            scoreDeadline: true,
            rosterChange: true,
          }),
          collect: vi.fn().mockResolvedValue([]),
        }),
      });

      const { updatePreferencesHandler } = await import("./notifications");

      await updatePreferencesHandler(mockCtx, {
        userId: "user-1" as any,
        leagueId: "league-1" as any,
        matchSchedule: false,
        scoreDeadline: true,
        rosterChange: false,
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("pref-1", {
        matchSchedule: false,
        scoreDeadline: true,
        rosterChange: false,
      });
    });
  });
});
