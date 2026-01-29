// ABOUTME: Tests for team management mutations and queries.
// ABOUTME: Verifies create, edit, and list behaviors with role-based access.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("teams", () => {
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
          return "team-new";
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
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    };
  });

  describe("getTeamsHandler", () => {
    it("returns all teams for a league", async () => {
      const teams = [
        { _id: "t1", leagueId: "league-1", name: "Eagles", venue: "Bar A" },
        { _id: "t2", leagueId: "league-1", name: "Hawks", venue: "Bar B" },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(teams),
        }),
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(teams),
        }),
      });

      const { getTeamsHandler } = await import("./teams");
      const result = await getTeamsHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Eagles");
    });
  });

  describe("createTeamHandler", () => {
    it("creates a team with name, venue, and division", async () => {
      const { createTeamHandler } = await import("./teams");

      const result = await createTeamHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        name: "Eagles",
        venue: "The Pub",
        divisionId: "d1" as any,
      });

      expect(result).toBe("team-new");
      expect(insertedDocs).toHaveLength(1);
      expect(insertedDocs[0].table).toBe("teams");
      expect(insertedDocs[0].doc).toEqual({
        leagueId: "league-1",
        name: "Eagles",
        venue: "The Pub",
        divisionId: "d1",
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

      const { createTeamHandler } = await import("./teams");

      await expect(
        createTeamHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          name: "Hawks",
        }),
      ).rejects.toThrow();
    });
  });

  describe("editTeamHandler", () => {
    it("updates team name and venue", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "t1",
        leagueId: "league-1",
        name: "Old Name",
        venue: "Old Bar",
      });

      const { editTeamHandler } = await import("./teams");

      await editTeamHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        name: "New Name",
        venue: "New Bar",
        divisionId: "d1" as any,
      });

      expect(patchedDocs).toHaveLength(1);
      expect(patchedDocs[0]).toEqual({
        id: "t1",
        values: { name: "New Name", venue: "New Bar", divisionId: "d1" },
      });
    });

    it("rejects if team not in league", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "t1",
        leagueId: "league-other",
        name: "Eagles",
      });

      const { editTeamHandler } = await import("./teams");

      await expect(
        editTeamHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          teamId: "t1" as any,
          name: "New Name",
        }),
      ).rejects.toThrow("Team not found in this league");
    });
  });
});
