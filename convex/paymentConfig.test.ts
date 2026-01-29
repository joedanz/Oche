// ABOUTME: Tests for payment configuration mutations.
// ABOUTME: Verifies admin-only access, field updates, and validation.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("paymentConfig", () => {
  describe("updatePaymentConfigHandler", () => {
    let mockCtx: any;
    let patchedValues: any;

    beforeEach(() => {
      vi.resetAllMocks();
      patchedValues = null;
      mockCtx = {
        db: {
          get: vi.fn().mockResolvedValue({
            _id: "league-1",
            name: "Test League",
          }),
          patch: vi.fn(async (_id: string, values: any) => {
            patchedValues = values;
          }),
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
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

    it("updates all payment config fields", async () => {
      const { updatePaymentConfigHandler } = await import("./paymentConfig");

      await updatePaymentConfigHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        leagueFee: 50,
        weeklyFee: 10,
        feeSchedule: "weekly",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("league-1", {
        leagueFee: 50,
        weeklyFee: 10,
        feeSchedule: "weekly",
      });
    });

    it("rejects non-admin users", async () => {
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-2",
            leagueId: "league-1",
            role: "player",
          }),
        }),
      });

      const { updatePaymentConfigHandler } = await import("./paymentConfig");

      await expect(
        updatePaymentConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          leagueFee: 50,
          weeklyFee: 10,
          feeSchedule: "weekly",
        }),
      ).rejects.toThrow();
    });

    it("validates fee amounts are non-negative", async () => {
      const { updatePaymentConfigHandler } = await import("./paymentConfig");

      await expect(
        updatePaymentConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          leagueFee: -10,
          weeklyFee: 5,
          feeSchedule: "weekly",
        }),
      ).rejects.toThrow(/non-negative/i);
    });
  });
});
