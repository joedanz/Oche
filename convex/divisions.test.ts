// ABOUTME: Tests for division management mutations and queries.
// ABOUTME: Verifies create, edit, delete, list, and team assignment behaviors.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("divisions", () => {
  let mockCtx: any;
  let insertedDocs: any[];
  let patchedDocs: any[];
  let deletedIds: string[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];
    patchedDocs = [];
    deletedIds = [];

    mockCtx = {
      db: {
        insert: vi.fn(async (table: string, doc: any) => {
          insertedDocs.push({ table, doc });
          return "division-new";
        }),
        get: vi.fn(),
        patch: vi.fn(async (id: string, values: any) => {
          patchedDocs.push({ id, values });
        }),
        delete: vi.fn(async (id: string) => {
          deletedIds.push(id);
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

  describe("getDivisionsHandler", () => {
    it("returns all divisions for a league", async () => {
      const divisions = [
        { _id: "d1", leagueId: "league-1", name: "East" },
        { _id: "d2", leagueId: "league-1", name: "West" },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(divisions),
        }),
      });

      const { getDivisionsHandler } = await import("./divisions");
      const result = await getDivisionsHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("East");
    });
  });

  describe("createDivisionHandler", () => {
    it("creates a division with the given name", async () => {
      const { createDivisionHandler } = await import("./divisions");

      const result = await createDivisionHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        name: "North",
      });

      expect(result).toBe("division-new");
      expect(insertedDocs).toHaveLength(1);
      expect(insertedDocs[0].table).toBe("divisions");
      expect(insertedDocs[0].doc).toEqual({
        leagueId: "league-1",
        name: "North",
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

      const { createDivisionHandler } = await import("./divisions");

      await expect(
        createDivisionHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          name: "South",
        }),
      ).rejects.toThrow();
    });
  });

  describe("editDivisionHandler", () => {
    it("updates the division name", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "d1",
        leagueId: "league-1",
        name: "Old Name",
      });

      const { editDivisionHandler } = await import("./divisions");

      await editDivisionHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        divisionId: "d1" as any,
        name: "New Name",
      });

      expect(patchedDocs).toHaveLength(1);
      expect(patchedDocs[0]).toEqual({ id: "d1", values: { name: "New Name" } });
    });

    it("rejects if division not in league", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "d1",
        leagueId: "league-other",
        name: "East",
      });

      const { editDivisionHandler } = await import("./divisions");

      await expect(
        editDivisionHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          divisionId: "d1" as any,
          name: "New Name",
        }),
      ).rejects.toThrow("Division not found in this league");
    });
  });

  describe("deleteDivisionHandler", () => {
    it("deletes the division and unassigns teams", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "d1",
        leagueId: "league-1",
        name: "East",
      });

      // Teams query for unassigning
      const teamsInDivision = [
        { _id: "t1", divisionId: "d1" },
        { _id: "t2", divisionId: "d1" },
      ];
      let queryCallCount = 0;
      mockCtx.db.query = vi.fn().mockImplementation(() => {
        queryCallCount++;
        return {
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              _id: "m1",
              userId: "user-1",
              leagueId: "league-1",
              role: "admin",
            }),
            collect: vi.fn().mockResolvedValue(teamsInDivision),
          }),
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue(teamsInDivision),
          }),
        };
      });

      const { deleteDivisionHandler } = await import("./divisions");

      await deleteDivisionHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        divisionId: "d1" as any,
      });

      expect(deletedIds).toContain("d1");
      // Teams should have divisionId cleared
      expect(patchedDocs.some((p) => p.values.divisionId === undefined)).toBe(true);
    });
  });

  describe("assignTeamDivisionHandler", () => {
    it("assigns a team to a division", async () => {
      mockCtx.db.get = vi
        .fn()
        .mockResolvedValueOnce({ _id: "t1", leagueId: "league-1", name: "Eagles" })
        .mockResolvedValueOnce({ _id: "d1", leagueId: "league-1", name: "East" });

      const { assignTeamDivisionHandler } = await import("./divisions");

      await assignTeamDivisionHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        divisionId: "d1" as any,
      });

      expect(patchedDocs).toHaveLength(1);
      expect(patchedDocs[0]).toEqual({ id: "t1", values: { divisionId: "d1" } });
    });

    it("allows unassigning a team (null divisionId)", async () => {
      mockCtx.db.get = vi
        .fn()
        .mockResolvedValueOnce({ _id: "t1", leagueId: "league-1", name: "Eagles" });

      const { assignTeamDivisionHandler } = await import("./divisions");

      await assignTeamDivisionHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        divisionId: undefined,
      });

      expect(patchedDocs).toHaveLength(1);
      expect(patchedDocs[0]).toEqual({ id: "t1", values: { divisionId: undefined } });
    });
  });
});
