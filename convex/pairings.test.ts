// ABOUTME: Tests for player pairing mutations and queries.
// ABOUTME: Verifies saving pairings, duplicate-player prevention, and active-only filtering.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("pairings", () => {
  let mockCtx: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockCtx = {
      db: {
        insert: vi.fn(async () => "new-id"),
        get: vi.fn(),
        patch: vi.fn(),
        query: vi.fn().mockReturnValue({
          withIndex: vi.fn().mockReturnValue({
            unique: vi.fn().mockResolvedValue({
              _id: "m1",
              userId: "user-1",
              leagueId: "league-1",
              role: "captain",
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

  describe("savePairingsHandler", () => {
    it("saves pairings to the match", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "match-1",
        leagueId: "league-1",
        homeTeamId: "team-1",
        visitorTeamId: "team-2",
        pairings: [],
        status: "scheduled",
      });

      const { savePairingsHandler } = await import("./pairings");

      await savePairingsHandler(mockCtx, {
        matchId: "match-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        pairings: [
          { slot: 1, homePlayerId: "player-1" as any, visitorPlayerId: "player-2" as any },
          { slot: 2, homePlayerId: "player-3" as any, visitorPlayerId: "blind" as any },
        ],
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("match-1", {
        pairings: [
          { slot: 1, homePlayerId: "player-1", visitorPlayerId: "player-2" },
          { slot: 2, homePlayerId: "player-3", visitorPlayerId: "blind" },
        ],
      });
    });

    it("rejects duplicate player in same match", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "match-1",
        leagueId: "league-1",
        homeTeamId: "team-1",
        visitorTeamId: "team-2",
        pairings: [],
        status: "scheduled",
      });

      const { savePairingsHandler } = await import("./pairings");

      await expect(
        savePairingsHandler(mockCtx, {
          matchId: "match-1" as any,
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          pairings: [
            { slot: 1, homePlayerId: "player-1" as any, visitorPlayerId: "player-2" as any },
            { slot: 2, homePlayerId: "player-1" as any, visitorPlayerId: "player-3" as any },
          ],
        }),
      ).rejects.toThrow(/already paired/i);
    });

    it("allows blind to appear multiple times", async () => {
      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "match-1",
        leagueId: "league-1",
        homeTeamId: "team-1",
        visitorTeamId: "team-2",
        pairings: [],
        status: "scheduled",
      });

      const { savePairingsHandler } = await import("./pairings");

      await savePairingsHandler(mockCtx, {
        matchId: "match-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        pairings: [
          { slot: 1, homePlayerId: "blind" as any, visitorPlayerId: "blind" as any },
          { slot: 2, homePlayerId: "blind" as any, visitorPlayerId: "player-1" as any },
        ],
      });

      expect(mockCtx.db.patch).toHaveBeenCalled();
    });

    it("rejects non-captain/admin users", async () => {
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

      mockCtx.db.get = vi.fn().mockResolvedValue({
        _id: "match-1",
        leagueId: "league-1",
        homeTeamId: "team-1",
        visitorTeamId: "team-2",
        pairings: [],
        status: "scheduled",
      });

      const { savePairingsHandler } = await import("./pairings");

      await expect(
        savePairingsHandler(mockCtx, {
          matchId: "match-1" as any,
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          pairings: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe("getMatchWithRostersHandler", () => {
    it("returns match data with active players from both teams", async () => {
      mockCtx.db.get = vi.fn().mockImplementation(async (id: string) => {
        if (id === "match-1") {
          return {
            _id: "match-1",
            leagueId: "league-1",
            homeTeamId: "team-1",
            visitorTeamId: "team-2",
            pairings: [],
            status: "scheduled",
          };
        }
        if (id === "team-1") return { _id: "team-1", name: "Eagles", leagueId: "league-1" };
        if (id === "team-2") return { _id: "team-2", name: "Hawks", leagueId: "league-1" };
        if (id === "user-a") return { _id: "user-a", name: "Alice", email: "a@test.com" };
        if (id === "user-b") return { _id: "user-b", name: "Bob", email: "b@test.com" };
        return null;
      });

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "captain",
          }),
          collect: vi.fn().mockResolvedValue([]),
        }),
        filter: vi.fn().mockReturnValue({
          collect: vi.fn().mockImplementation(async () => {
            // Returns active players
            return [
              { _id: "player-a", userId: "user-a", teamId: "team-1", status: "active" },
              { _id: "player-b", userId: "user-b", teamId: "team-2", status: "active" },
            ];
          }),
        }),
      });

      const { getMatchWithRostersHandler } = await import("./pairings");

      const result = await getMatchWithRostersHandler(mockCtx, {
        matchId: "match-1" as any,
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result.match._id).toBe("match-1");
      expect(result.homeTeamName).toBe("Eagles");
      expect(result.visitorTeamName).toBe("Hawks");
      expect(result.homePlayers).toBeDefined();
      expect(result.visitorPlayers).toBeDefined();
    });
  });
});
