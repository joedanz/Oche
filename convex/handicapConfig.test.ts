// ABOUTME: Tests for handicap configuration mutations.
// ABOUTME: Verifies admin-only access, field updates, and validation.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("handicapConfig", () => {
  describe("updateHandicapConfigHandler", () => {
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
            handicapEnabled: false,
            handicapPercent: 100,
            handicapRecalcFrequency: "weekly",
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

    it("updates all handicap config fields", async () => {
      const { updateHandicapConfigHandler } = await import("./handicapConfig");

      await updateHandicapConfigHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        handicapEnabled: true,
        handicapPercent: 75,
        handicapRecalcFrequency: "per-match",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("league-1", {
        handicapEnabled: true,
        handicapPercent: 75,
        handicapRecalcFrequency: "per-match",
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

      const { updateHandicapConfigHandler } = await import("./handicapConfig");

      await expect(
        updateHandicapConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          handicapEnabled: true,
          handicapPercent: 75,
          handicapRecalcFrequency: "weekly",
        }),
      ).rejects.toThrow();
    });

    it("validates handicap percent is between 0 and 100", async () => {
      const { updateHandicapConfigHandler } = await import("./handicapConfig");

      await expect(
        updateHandicapConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          handicapEnabled: true,
          handicapPercent: 150,
          handicapRecalcFrequency: "weekly",
        }),
      ).rejects.toThrow(/between 0 and 100/i);
    });
  });
});
