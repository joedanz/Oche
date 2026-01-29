// ABOUTME: Tests for plan-based feature gating and limit enforcement.
// ABOUTME: Verifies that subscription lookups correctly gate features and enforce limits.

import { describe, it, expect, vi } from "vitest";
import {
  getUserPlanId,
  requireFeature,
  requireLimit,
} from "./planGating";
import type { Feature, PlanId } from "./plans";

function mockDbWithSubscription(planId: PlanId | null) {
  return {
    query: vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue(
          planId
            ? { planId, status: "active", userId: "user-1" }
            : null,
        ),
      }),
    }),
  };
}

describe("planGating", () => {
  describe("getUserPlanId", () => {
    it("returns starter when no subscription exists", async () => {
      const db = mockDbWithSubscription(null);
      const result = await getUserPlanId(db as any, "user-1" as any);
      expect(result).toBe("starter");
    });

    it("returns the subscribed plan", async () => {
      const db = mockDbWithSubscription("league");
      const result = await getUserPlanId(db as any, "user-1" as any);
      expect(result).toBe("league");
    });

    it("returns starter when subscription is canceled", async () => {
      const db = {
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              planId: "league",
              status: "canceled",
              userId: "user-1",
            }),
          }),
        }),
      };
      const result = await getUserPlanId(db as any, "user-1" as any);
      expect(result).toBe("starter");
    });

    it("returns the plan when status is past_due (grace period)", async () => {
      const db = {
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              planId: "league",
              status: "past_due",
              userId: "user-1",
            }),
          }),
        }),
      };
      const result = await getUserPlanId(db as any, "user-1" as any);
      expect(result).toBe("league");
    });
  });

  describe("requireFeature", () => {
    it("throws when starter user tries to access a pro feature", async () => {
      const db = mockDbWithSubscription(null);
      await expect(
        requireFeature(db as any, "user-1" as any, "tournaments"),
      ).rejects.toThrow("requires a paid plan");
    });

    it("succeeds when league user accesses a pro feature", async () => {
      const db = mockDbWithSubscription("league");
      await expect(
        requireFeature(db as any, "user-1" as any, "tournaments"),
      ).resolves.not.toThrow();
    });

    it("throws when league user tries to access association feature", async () => {
      const db = mockDbWithSubscription("league");
      await expect(
        requireFeature(db as any, "user-1" as any, "cross_league_stats"),
      ).rejects.toThrow("requires a paid plan");
    });
  });

  describe("requireLimit", () => {
    it("throws when starter user exceeds league limit", async () => {
      const db = mockDbWithSubscription(null);
      await expect(
        requireLimit(db as any, "user-1" as any, "maxLeagues", 1),
      ).rejects.toThrow("plan limit");
    });

    it("succeeds when starter user is within league limit", async () => {
      const db = mockDbWithSubscription(null);
      await expect(
        requireLimit(db as any, "user-1" as any, "maxLeagues", 0),
      ).resolves.not.toThrow();
    });

    it("succeeds when league user is within 3 league limit", async () => {
      const db = mockDbWithSubscription("league");
      await expect(
        requireLimit(db as any, "user-1" as any, "maxLeagues", 2),
      ).resolves.not.toThrow();
    });

    it("blocks league user from creating 4th league", async () => {
      const db = mockDbWithSubscription("league");
      await expect(
        requireLimit(db as any, "user-1" as any, "maxLeagues", 3),
      ).rejects.toThrow("plan limit");
    });

    it("allows association user unlimited leagues", async () => {
      const db = mockDbWithSubscription("association");
      await expect(
        requireLimit(db as any, "user-1" as any, "maxLeagues", 50),
      ).resolves.not.toThrow();
    });
  });
});
