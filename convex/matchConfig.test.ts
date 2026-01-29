// ABOUTME: Tests for match configuration mutations.
// ABOUTME: Verifies admin-only access, field validation, and partial updates.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("matchConfig", () => {
  describe("updateMatchConfigHandler", () => {
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
            matchConfig: {
              gamesPerMatch: 5,
              pointsPerGameWin: 1,
              bonusForTotal: true,
              extraExclude: true,
              blindRules: { enabled: false, defaultRuns: 0 },
            },
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

    it("updates all match config fields", async () => {
      const { updateMatchConfigHandler } = await import("./matchConfig");

      await updateMatchConfigHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        gamesPerMatch: 3,
        pointsPerGameWin: 2,
        bonusForTotal: false,
        extraExclude: false,
        blindEnabled: true,
        blindDefaultRuns: 5,
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("league-1", {
        matchConfig: {
          gamesPerMatch: 3,
          pointsPerGameWin: 2,
          bonusForTotal: false,
          extraExclude: false,
          blindRules: { enabled: true, defaultRuns: 5 },
        },
      });
    });

    it("rejects non-admin users", async () => {
      // Override to return player role
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

      const { updateMatchConfigHandler } = await import("./matchConfig");

      await expect(
        updateMatchConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          gamesPerMatch: 3,
          pointsPerGameWin: 1,
          bonusForTotal: true,
          extraExclude: true,
          blindEnabled: false,
          blindDefaultRuns: 0,
        }),
      ).rejects.toThrow();
    });

    it("validates gamesPerMatch is at least 1", async () => {
      const { updateMatchConfigHandler } = await import("./matchConfig");

      await expect(
        updateMatchConfigHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          gamesPerMatch: 0,
          pointsPerGameWin: 1,
          bonusForTotal: true,
          extraExclude: true,
          blindEnabled: false,
          blindDefaultRuns: 0,
        }),
      ).rejects.toThrow(/at least 1/i);
    });
  });
});
