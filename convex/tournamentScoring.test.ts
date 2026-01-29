// ABOUTME: Tests for tournament match scoring and winner advancement.
// ABOUTME: Verifies recording results, automatic bracket advancement, and championship detection.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("tournamentScoring", () => {
  let mockCtx: any;

  function makeBracket4Teams() {
    // 4 teams: 2 first-round matches + 1 final = 3 bracket matches
    return [
      {
        matchIndex: 0,
        round: 1,
        participant1Id: "t1",
        participant1Name: "Alpha",
        participant1Seed: 1,
        participant2Id: "t2",
        participant2Name: "Beta",
        participant2Seed: 4,
        winnerId: null,
      },
      {
        matchIndex: 1,
        round: 1,
        participant1Id: "t3",
        participant1Name: "Gamma",
        participant1Seed: 2,
        participant2Id: "t4",
        participant2Name: "Delta",
        participant2Seed: 3,
        winnerId: null,
      },
      {
        matchIndex: 2,
        round: 2,
        participant1Id: null,
        participant1Name: null,
        participant1Seed: null,
        participant2Id: null,
        participant2Name: null,
        participant2Seed: null,
        winnerId: null,
      },
    ];
  }

  beforeEach(() => {
    vi.resetAllMocks();

    mockCtx = {
      db: {
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
        }),
      },
    };
  });

  describe("recordTournamentMatchResultHandler", () => {
    it("records a winner and advances to next round", async () => {
      const bracket = makeBracket4Teams();
      mockCtx.db.get.mockResolvedValue({
        _id: "tour-1",
        leagueId: "league-1",
        rounds: 2,
        bracket,
        status: "pending",
      });

      const { recordTournamentMatchResultHandler } = await import(
        "./tournamentScoring"
      );

      await recordTournamentMatchResultHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        tournamentId: "tour-1" as any,
        matchIndex: 0,
        winnerId: "t1",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        "tour-1",
        expect.objectContaining({
          bracket: expect.arrayContaining([
            expect.objectContaining({
              matchIndex: 0,
              winnerId: "t1",
            }),
            // Winner should be advanced to final match as participant1
            expect.objectContaining({
              matchIndex: 2,
              participant1Id: "t1",
              participant1Name: "Alpha",
              participant1Seed: 1,
            }),
          ]),
          status: "in_progress",
        }),
      );
    });

    it("completes tournament when final match winner is recorded", async () => {
      const bracket = makeBracket4Teams();
      // Set up: both semifinal winners already advanced
      bracket[0].winnerId = "t1";
      bracket[1].winnerId = "t3";
      bracket[2].participant1Id = "t1";
      bracket[2].participant1Name = "Alpha";
      bracket[2].participant1Seed = 1;
      bracket[2].participant2Id = "t3";
      bracket[2].participant2Name = "Gamma";
      bracket[2].participant2Seed = 2;

      mockCtx.db.get.mockResolvedValue({
        _id: "tour-1",
        leagueId: "league-1",
        rounds: 2,
        bracket,
        status: "in_progress",
      });

      const { recordTournamentMatchResultHandler } = await import(
        "./tournamentScoring"
      );

      await recordTournamentMatchResultHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        tournamentId: "tour-1" as any,
        matchIndex: 2,
        winnerId: "t1",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        "tour-1",
        expect.objectContaining({
          status: "completed",
          bracket: expect.arrayContaining([
            expect.objectContaining({
              matchIndex: 2,
              winnerId: "t1",
            }),
          ]),
        }),
      );
    });

    it("rejects invalid winnerId not in the match", async () => {
      const bracket = makeBracket4Teams();
      mockCtx.db.get.mockResolvedValue({
        _id: "tour-1",
        leagueId: "league-1",
        rounds: 2,
        bracket,
        status: "pending",
      });

      const { recordTournamentMatchResultHandler } = await import(
        "./tournamentScoring"
      );

      await expect(
        recordTournamentMatchResultHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          tournamentId: "tour-1" as any,
          matchIndex: 0,
          winnerId: "t99",
        }),
      ).rejects.toThrow(/not a participant/i);
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

      const bracket = makeBracket4Teams();
      mockCtx.db.get.mockResolvedValue({
        _id: "tour-1",
        leagueId: "league-1",
        rounds: 2,
        bracket,
        status: "pending",
      });

      const { recordTournamentMatchResultHandler } = await import(
        "./tournamentScoring"
      );

      await expect(
        recordTournamentMatchResultHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          tournamentId: "tour-1" as any,
          matchIndex: 0,
          winnerId: "t1",
        }),
      ).rejects.toThrow();
    });

    it("advances second match winner to participant2 slot", async () => {
      const bracket = makeBracket4Teams();
      mockCtx.db.get.mockResolvedValue({
        _id: "tour-1",
        leagueId: "league-1",
        rounds: 2,
        bracket,
        status: "pending",
      });

      const { recordTournamentMatchResultHandler } = await import(
        "./tournamentScoring"
      );

      await recordTournamentMatchResultHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        tournamentId: "tour-1" as any,
        matchIndex: 1,
        winnerId: "t3",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        "tour-1",
        expect.objectContaining({
          bracket: expect.arrayContaining([
            expect.objectContaining({
              matchIndex: 2,
              participant2Id: "t3",
              participant2Name: "Gamma",
              participant2Seed: 2,
            }),
          ]),
        }),
      );
    });
  });
});
