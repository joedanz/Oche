// ABOUTME: Tests for league invitation mutations and queries.
// ABOUTME: Verifies invite creation, listing, revocation, and redemption logic.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("invites", () => {
  describe("createInviteHandler", () => {
    it("creates an invite with a unique code and specified role", async () => {
      const insertedRecords: { table: string; doc: any }[] = [];
      const mockCtx = {
        db: {
          insert: vi.fn(async (table: string, doc: any) => {
            insertedRecords.push({ table, doc });
            return "invite-1";
          }),
        },
      };

      const { createInviteHandler } = await import("./invites");
      const result = await createInviteHandler(mockCtx as any, {
        leagueId: "league-1" as any,
        role: "captain",
        userId: "user-1" as any,
      });

      expect(insertedRecords).toHaveLength(1);
      expect(insertedRecords[0].table).toBe("invites");
      expect(insertedRecords[0].doc.leagueId).toBe("league-1");
      expect(insertedRecords[0].doc.role).toBe("captain");
      expect(insertedRecords[0].doc.createdBy).toBe("user-1");
      expect(insertedRecords[0].doc.used).toBe(false);
      expect(typeof insertedRecords[0].doc.code).toBe("string");
      expect(insertedRecords[0].doc.code.length).toBeGreaterThan(0);
      expect(typeof insertedRecords[0].doc.expiresAt).toBe("number");
      expect(result).toBe("invite-1");
    });
  });

  describe("getLeagueInvitesHandler", () => {
    it("returns invites for a given league", async () => {
      const invites = [
        { _id: "i1", code: "abc123", role: "captain", used: false },
        { _id: "i2", code: "def456", role: "player", used: true },
      ];
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(invites),
            }),
          }),
        },
      };

      const { getLeagueInvitesHandler } = await import("./invites");
      const result = await getLeagueInvitesHandler(mockCtx as any, {
        leagueId: "league-1" as any,
      });

      expect(result).toEqual(invites);
    });
  });

  describe("revokeInviteHandler", () => {
    it("marks an invite as used", async () => {
      const mockCtx = {
        db: {
          get: vi.fn().mockResolvedValue({
            _id: "invite-1",
            leagueId: "league-1",
            used: false,
          }),
          patch: vi.fn().mockResolvedValue(undefined),
        },
      };

      const { revokeInviteHandler } = await import("./invites");
      await revokeInviteHandler(mockCtx as any, {
        inviteId: "invite-1" as any,
        leagueId: "league-1" as any,
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("invite-1", { used: true });
    });

    it("throws if invite does not belong to the league", async () => {
      const mockCtx = {
        db: {
          get: vi.fn().mockResolvedValue({
            _id: "invite-1",
            leagueId: "other-league",
            used: false,
          }),
        },
      };

      const { revokeInviteHandler } = await import("./invites");
      await expect(
        revokeInviteHandler(mockCtx as any, {
          inviteId: "invite-1" as any,
          leagueId: "league-1" as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe("acceptInviteHandler", () => {
    it("creates a membership when accepting a valid invite", async () => {
      const insertedRecords: { table: string; doc: any }[] = [];
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({
                  _id: "invite-1",
                  leagueId: "league-1",
                  role: "player",
                  used: false,
                  expiresAt: Date.now() + 100000,
                }),
              }),
            }),
          }),
          insert: vi.fn(async (table: string, doc: any) => {
            insertedRecords.push({ table, doc });
            return "membership-1";
          }),
          patch: vi.fn().mockResolvedValue(undefined),
        },
      };

      const { acceptInviteHandler } = await import("./invites");
      await acceptInviteHandler(mockCtx as any, {
        code: "abc123",
        userId: "user-1" as any,
      });

      expect(insertedRecords).toHaveLength(1);
      expect(insertedRecords[0].table).toBe("leagueMemberships");
      expect(insertedRecords[0].doc.role).toBe("player");
      expect(insertedRecords[0].doc.leagueId).toBe("league-1");
      expect(insertedRecords[0].doc.userId).toBe("user-1");
      expect(mockCtx.db.patch).toHaveBeenCalledWith("invite-1", { used: true });
    });

    it("throws if invite code is invalid or expired", async () => {
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(null),
              }),
            }),
          }),
        },
      };

      const { acceptInviteHandler } = await import("./invites");
      await expect(
        acceptInviteHandler(mockCtx as any, {
          code: "invalid",
          userId: "user-1" as any,
        }),
      ).rejects.toThrow();
    });
  });
});
