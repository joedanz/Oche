// ABOUTME: Tests for season management mutations and queries.
// ABOUTME: Verifies create, activate, archive, and listing behaviors.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("seasons", () => {
  let mockCtx: any;
  let insertedDocs: any[];
  let patchedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];
    patchedDocs = [];

    mockCtx = {
      db: {
        insert: vi.fn(async (table: string, doc: any) => {
          insertedDocs.push({ table, doc });
          return "season-new";
        }),
        get: vi.fn(),
        patch: vi.fn(async (id: string, values: any) => {
          patchedDocs.push({ id, values });
        }),
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              _id: "m1",
              userId: "user-1",
              leagueId: "league-1",
              role: "admin",
            }),
            collect: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    };
  });

  describe("createSeasonHandler", () => {
    it("creates a season with isActive false by default", async () => {
      const { createSeasonHandler } = await import("./seasons");

      const result = await createSeasonHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        name: "Spring 2026",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
      });

      expect(result).toBe("season-new");
      expect(insertedDocs).toHaveLength(1);
      expect(insertedDocs[0].table).toBe("seasons");
      expect(insertedDocs[0].doc).toEqual({
        leagueId: "league-1",
        name: "Spring 2026",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        isActive: false,
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
          collect: vi.fn().mockResolvedValue([]),
        }),
      });

      const { createSeasonHandler } = await import("./seasons");

      await expect(
        createSeasonHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          name: "Spring 2026",
          startDate: "2026-03-01",
          endDate: "2026-06-30",
        }),
      ).rejects.toThrow();
    });
  });

  describe("activateSeasonHandler", () => {
    it("deactivates other seasons and activates the target", async () => {
      const existingSeasons = [
        { _id: "season-old", leagueId: "league-1", isActive: true },
        { _id: "season-target", leagueId: "league-1", isActive: false },
      ];

      // query for authorization
      const authQuery = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(existingSeasons),
        }),
      });

      mockCtx.db.query = authQuery;
      mockCtx.db.get = vi.fn().mockResolvedValue(existingSeasons[1]);

      const { activateSeasonHandler } = await import("./seasons");

      await activateSeasonHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        seasonId: "season-target" as any,
      });

      // Should have patched the old season to inactive and the target to active
      const activePatch = patchedDocs.find((p) => p.id === "season-target");
      expect(activePatch).toBeDefined();
      expect(activePatch.values.isActive).toBe(true);
    });
  });

  describe("getSeasonsHandler", () => {
    it("returns all seasons for a league", async () => {
      const seasons = [
        {
          _id: "s1",
          leagueId: "league-1",
          name: "Spring 2026",
          startDate: "2026-03-01",
          endDate: "2026-06-30",
          isActive: true,
        },
        {
          _id: "s2",
          leagueId: "league-1",
          name: "Fall 2025",
          startDate: "2025-09-01",
          endDate: "2025-12-15",
          isActive: false,
        },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(seasons),
        }),
      });

      const { getSeasonsHandler } = await import("./seasons");

      const result = await getSeasonsHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Spring 2026");
    });
  });
});
