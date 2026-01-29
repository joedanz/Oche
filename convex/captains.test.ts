// ABOUTME: Tests for captain assignment mutations.
// ABOUTME: Verifies assign, change, and role-update behaviors.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("captains", () => {
  let mockCtx: any;
  let patchedDocs: any[];

  beforeEach(() => {
    vi.resetAllMocks();
    patchedDocs = [];

    mockCtx = {
      db: {
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

  describe("assignCaptainHandler", () => {
    it("sets captainId on the team and updates membership role to captain", async () => {
      // Player belongs to the team
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "t1")
          return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        if (id === "p1")
          return {
            _id: "p1",
            userId: "user-player",
            teamId: "t1",
            status: "active",
          };
        return null;
      });

      // Mock membership lookup for the player's user
      const membershipLookupCalls: string[] = [];
      mockCtx.db.query = vi.fn().mockImplementation((table: string) => {
        if (table === "leagueMemberships") {
          return {
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockImplementation(async () => {
                membershipLookupCalls.push("lookup");
                // First call: admin auth check, second call: player's membership
                if (membershipLookupCalls.length === 1) {
                  return {
                    _id: "m1",
                    userId: "user-1",
                    leagueId: "league-1",
                    role: "admin",
                  };
                }
                return {
                  _id: "m-player",
                  userId: "user-player",
                  leagueId: "league-1",
                  role: "player",
                };
              }),
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const { assignCaptainHandler } = await import("./captains");

      await assignCaptainHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        playerId: "p1" as any,
      });

      // Team captainId should be set
      expect(patchedDocs).toContainEqual({
        id: "t1",
        values: { captainId: "p1" },
      });
      // Player's membership role should be updated to captain
      expect(patchedDocs).toContainEqual({
        id: "m-player",
        values: { role: "captain" },
      });
    });

    it("rejects if player is not on the team", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "t1")
          return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        if (id === "p1")
          return {
            _id: "p1",
            userId: "user-player",
            teamId: "t-other",
            status: "active",
          };
        return null;
      });

      const { assignCaptainHandler } = await import("./captains");

      await expect(
        assignCaptainHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          teamId: "t1" as any,
          playerId: "p1" as any,
        }),
      ).rejects.toThrow("Player is not on this team");
    });

    it("demotes previous captain to player role", async () => {
      // Team already has a captain
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "t1")
          return {
            _id: "t1",
            leagueId: "league-1",
            name: "Eagles",
            captainId: "p-old",
          };
        if (id === "p1")
          return {
            _id: "p1",
            userId: "user-new-cap",
            teamId: "t1",
            status: "active",
          };
        if (id === "p-old")
          return {
            _id: "p-old",
            userId: "user-old-cap",
            teamId: "t1",
            status: "active",
          };
        return null;
      });

      const membershipCalls: string[] = [];
      mockCtx.db.query = vi.fn().mockImplementation((table: string) => {
        if (table === "leagueMemberships") {
          return {
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockImplementation(async () => {
                membershipCalls.push("call");
                const callNum = membershipCalls.length;
                // 1: admin auth, 2: old captain membership, 3: new captain membership
                if (callNum === 1) {
                  return {
                    _id: "m1",
                    userId: "user-1",
                    leagueId: "league-1",
                    role: "admin",
                  };
                }
                if (callNum === 2) {
                  return {
                    _id: "m-old",
                    userId: "user-old-cap",
                    leagueId: "league-1",
                    role: "captain",
                  };
                }
                return {
                  _id: "m-new",
                  userId: "user-new-cap",
                  leagueId: "league-1",
                  role: "player",
                };
              }),
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const { assignCaptainHandler } = await import("./captains");

      await assignCaptainHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        playerId: "p1" as any,
      });

      // Old captain demoted to player
      expect(patchedDocs).toContainEqual({
        id: "m-old",
        values: { role: "player" },
      });
      // New captain promoted
      expect(patchedDocs).toContainEqual({
        id: "m-new",
        values: { role: "captain" },
      });
      // Team captainId updated
      expect(patchedDocs).toContainEqual({
        id: "t1",
        values: { captainId: "p1" },
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

      const { assignCaptainHandler } = await import("./captains");

      await expect(
        assignCaptainHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          teamId: "t1" as any,
          playerId: "p1" as any,
        }),
      ).rejects.toThrow();
    });
  });
});
