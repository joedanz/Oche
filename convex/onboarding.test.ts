// ABOUTME: Tests for onboarding queries and mutations.
// ABOUTME: Verifies league creation assigns admin role and getUserLeagues returns memberships.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("onboarding", () => {
  describe("createLeague", () => {
    it("creates a league and adds the creator as admin", async () => {
      const insertedRecords: { table: string; doc: any }[] = [];
      const mockCtx = {
        db: {
          insert: vi.fn(async (table: string, doc: any) => {
            insertedRecords.push({ table, doc });
            if (table === "leagues") return "league-1";
            return "membership-1";
          }),
        },
      };

      // Import and call the handler directly
      const { createLeagueHandler } = await import("./onboarding");
      await createLeagueHandler(mockCtx as any, {
        name: "Test League",
        userId: "user-1" as any,
      });

      expect(insertedRecords).toHaveLength(2);
      expect(insertedRecords[0].table).toBe("leagues");
      expect(insertedRecords[0].doc.name).toBe("Test League");
      expect(insertedRecords[1].table).toBe("leagueMemberships");
      expect(insertedRecords[1].doc.role).toBe("admin");
      expect(insertedRecords[1].doc.leagueId).toBe("league-1");
    });

    it("throws if name is empty", async () => {
      const { createLeagueHandler } = await import("./onboarding");
      const mockCtx = { db: { insert: vi.fn() } };

      await expect(
        createLeagueHandler(mockCtx as any, {
          name: "",
          userId: "user-1" as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getUserLeagues", () => {
    it("returns league memberships for the given user", async () => {
      const memberships = [
        { _id: "m1", userId: "user-1", leagueId: "l1", role: "admin" },
      ];
      const mockCtx = {
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(memberships),
            }),
          }),
        },
      };

      const { getUserLeaguesHandler } = await import("./onboarding");
      const result = await getUserLeaguesHandler(mockCtx as any, {
        userId: "user-1" as any,
      });

      expect(result).toEqual(memberships);
    });
  });
});
