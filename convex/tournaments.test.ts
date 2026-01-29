// ABOUTME: Tests for tournament management mutations and queries.
// ABOUTME: Verifies create, list, and detail behaviors with role checks.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("tournaments", () => {
  let mockCtx: any;
  let insertedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    insertedDocs = [];

    mockCtx = {
      db: {
        insert: vi.fn(async (table: string, doc: any) => {
          insertedDocs.push({ table, doc });
          return "tournament-new";
        }),
        get: vi.fn(async (id: string) => {
          if (id.startsWith("p")) {
            return { _id: id, userId: "user-p", teamId: "t1", status: "active" };
          }
          if (id === "user-p") {
            return { _id: "user-p", name: "Alice", email: "alice@test.com" };
          }
          if (id.startsWith("t")) {
            return { _id: id, name: `Team ${id}` };
          }
          return null;
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

  describe("createTournamentHandler", () => {
    it("creates a tournament with seeded bracket", async () => {
      const { createTournamentHandler } = await import("./tournaments");

      const result = await createTournamentHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        name: "Spring Playoffs",
        date: "2026-04-15",
        format: "single-elimination",
        participantIds: ["p1", "p2", "p3", "p4"],
        participantType: "player",
      });

      expect(result).toBe("tournament-new");
      expect(insertedDocs).toHaveLength(1);
      expect(insertedDocs[0].table).toBe("tournaments");

      const doc = insertedDocs[0].doc;
      expect(doc.name).toBe("Spring Playoffs");
      expect(doc.rounds).toBe(2);
      expect(doc.status).toBe("pending");
      // 4 participants = 2 first-round + 1 final = 3 bracket matches
      expect(doc.bracket).toHaveLength(3);
    });

    it("rejects fewer than 2 participants", async () => {
      const { createTournamentHandler } = await import("./tournaments");

      await expect(
        createTournamentHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          name: "Too Small",
          date: "2026-04-15",
          format: "single-elimination",
          participantIds: ["p1"],
          participantType: "player",
        }),
      ).rejects.toThrow("Need at least 2 participants");
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

      const { createTournamentHandler } = await import("./tournaments");

      await expect(
        createTournamentHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          name: "Test",
          date: "2026-04-15",
          format: "single-elimination",
          participantIds: ["p1", "p2"],
          participantType: "player",
        }),
      ).rejects.toThrow();
    });

    it("handles byes for non-power-of-2 participants", async () => {
      const { createTournamentHandler } = await import("./tournaments");

      await createTournamentHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        name: "5-Player Tourney",
        date: "2026-04-15",
        format: "single-elimination",
        participantIds: ["p1", "p2", "p3", "p4", "p5"],
        participantType: "player",
      });

      const doc = insertedDocs[0].doc;
      expect(doc.rounds).toBe(3);
      // bracket size 8: 4 + 2 + 1 = 7
      expect(doc.bracket).toHaveLength(7);
      // 3 byes = 3 first-round matches with auto-winners
      const byeMatches = doc.bracket.filter(
        (m: any) => m.round === 1 && m.winnerId !== null,
      );
      expect(byeMatches).toHaveLength(3);
    });
  });

  describe("getTournamentsHandler", () => {
    it("returns all tournaments for a league", async () => {
      const tournaments = [
        { _id: "t1", leagueId: "league-1", name: "Spring Playoffs" },
      ];

      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1",
            userId: "user-1",
            leagueId: "league-1",
            role: "admin",
          }),
          collect: vi.fn().mockResolvedValue(tournaments),
        }),
      });

      const { getTournamentsHandler } = await import("./tournaments");

      const result = await getTournamentsHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Spring Playoffs");
    });
  });

  describe("getTournamentDetailHandler", () => {
    it("returns tournament details", async () => {
      const tournament = {
        _id: "tournament-1",
        leagueId: "league-1",
        name: "Spring Playoffs",
        bracket: [],
      };
      mockCtx.db.get = vi.fn().mockResolvedValue(tournament);

      const { getTournamentDetailHandler } = await import("./tournaments");

      const result = await getTournamentDetailHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        tournamentId: "tournament-1" as any,
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe("Spring Playoffs");
    });
  });
});
