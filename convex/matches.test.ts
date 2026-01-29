// ABOUTME: Tests for match scheduling mutations and queries.
// ABOUTME: Verifies create, list, and validation (no self-play, no double-booking).

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("matches", () => {
  let mockCtx: any;
  let insertedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];

    mockCtx = {
      db: {
        insert: vi.fn(async (table: string, doc: any) => {
          insertedDocs.push({ table, doc });
          return "match-new";
        }),
        get: vi.fn(),
        patch: vi.fn(),
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

  describe("createMatchHandler", () => {
    it("creates a match with correct fields", async () => {
      const { createMatchHandler } = await import("./matches");

      const result = await createMatchHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        seasonId: "season-1" as any,
        homeTeamId: "team-1" as any,
        visitorTeamId: "team-2" as any,
        date: "2026-02-15",
      });

      expect(result).toBe("match-new");
      expect(insertedDocs).toHaveLength(1);
      expect(insertedDocs[0].table).toBe("matches");
      expect(insertedDocs[0].doc).toEqual({
        leagueId: "league-1",
        seasonId: "season-1",
        homeTeamId: "team-1",
        visitorTeamId: "team-2",
        date: "2026-02-15",
        status: "scheduled",
        pairings: [],
      });
    });

    it("rejects scheduling a team against itself", async () => {
      const { createMatchHandler } = await import("./matches");

      await expect(
        createMatchHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          seasonId: "season-1" as any,
          homeTeamId: "team-1" as any,
          visitorTeamId: "team-1" as any,
          date: "2026-02-15",
        }),
      ).rejects.toThrow("A team cannot play against itself");
    });

    it("rejects double-booking a team on the same date", async () => {
      // Existing match on same date with team-1
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue([
            {
              _id: "existing-match",
              leagueId: "league-1",
              seasonId: "season-1",
              homeTeamId: "team-1",
              visitorTeamId: "team-3",
              date: "2026-02-15",
              status: "scheduled",
              pairings: [],
            },
          ]),
        }),
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([
            {
              _id: "existing-match",
              leagueId: "league-1",
              seasonId: "season-1",
              homeTeamId: "team-1",
              visitorTeamId: "team-3",
              date: "2026-02-15",
              status: "scheduled",
              pairings: [],
            },
          ]),
        }),
      });

      const { createMatchHandler } = await import("./matches");

      await expect(
        createMatchHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          seasonId: "season-1" as any,
          homeTeamId: "team-1" as any,
          visitorTeamId: "team-2" as any,
          date: "2026-02-15",
        }),
      ).rejects.toThrow(/already scheduled/i);
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

      const { createMatchHandler } = await import("./matches");

      await expect(
        createMatchHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          seasonId: "season-1" as any,
          homeTeamId: "team-1" as any,
          visitorTeamId: "team-2" as any,
          date: "2026-02-15",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getMatchesHandler", () => {
    it("returns all matches for a league", async () => {
      const matches = [
        {
          _id: "match-1",
          leagueId: "league-1",
          seasonId: "season-1",
          homeTeamId: "team-1",
          visitorTeamId: "team-2",
          date: "2026-02-15",
          status: "scheduled",
          pairings: [],
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
          collect: vi.fn().mockResolvedValue(matches),
        }),
      });

      const { getMatchesHandler } = await import("./matches");
      const result = await getMatchesHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-02-15");
    });
  });
});
