// ABOUTME: Tests for team roster management mutations.
// ABOUTME: Verifies add, remove, and status toggle behaviors with role checks.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("roster", () => {
  let mockCtx: any;
  let patchedDocs: any[];
  let insertedDocs: any[];
  let deletedIds: string[];

  beforeEach(() => {
    vi.resetAllMocks();
    patchedDocs = [];
    insertedDocs = [];
    deletedIds = [];

    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(async (id: string, values: any) => {
          patchedDocs.push({ id, values });
        }),
        insert: vi.fn(async (table: string, doc: any) => {
          insertedDocs.push({ table, doc });
          return `new-${table}-id`;
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
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      },
    };
  });

  describe("addPlayerHandler", () => {
    it("creates a new user and player record when email not found", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        return null;
      });

      const filterCalls: string[] = [];
      mockCtx.db.query = vi.fn().mockImplementation((table: string) => {
        if (table === "leagueMemberships") {
          return {
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockImplementation(async () => {
                // First: admin auth check, second: membership check for new user
                if (filterCalls.length === 0) {
                  filterCalls.push("auth");
                  return { _id: "m1", userId: "user-1", leagueId: "league-1", role: "admin" };
                }
                return null; // no existing membership
              }),
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        if (table === "users") {
          return {
            filter: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        if (table === "players") {
          return {
            filter: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      });

      const { addPlayerHandler } = await import("./roster");

      await addPlayerHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        teamId: "t1" as any,
        playerName: "Alice",
        playerEmail: "alice@test.com",
      });

      expect(insertedDocs).toContainEqual({
        table: "users",
        doc: { email: "alice@test.com", name: "Alice" },
      });
      expect(insertedDocs).toContainEqual({
        table: "players",
        doc: { userId: "new-users-id", teamId: "t1", status: "active" },
      });
    });

    it("rejects duplicate player on same team", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        return null;
      });

      mockCtx.db.query = vi.fn().mockImplementation((table: string) => {
        if (table === "leagueMemberships") {
          return {
            withIndex: vi.fn().mockReturnValue({
              unique: vi.fn().mockResolvedValue({
                _id: "m1", userId: "user-1", leagueId: "league-1", role: "admin",
              }),
              collect: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        if (table === "users") {
          return {
            filter: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue([{ _id: "existing-user" }]),
            }),
          };
        }
        if (table === "players") {
          return {
            filter: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({ _id: "p-existing", userId: "existing-user", teamId: "t1" }),
              collect: vi.fn().mockResolvedValue([{ _id: "p-existing" }]),
            }),
          };
        }
        return {
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      });

      const { addPlayerHandler } = await import("./roster");

      await expect(
        addPlayerHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-1" as any,
          teamId: "t1" as any,
          playerName: "Alice",
          playerEmail: "alice@test.com",
        }),
      ).rejects.toThrow("Player is already on this team");
    });

    it("rejects non-admin/captain users", async () => {
      mockCtx.db.query = vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue({
            _id: "m1", userId: "user-2", leagueId: "league-1", role: "player",
          }),
          collect: vi.fn().mockResolvedValue([]),
        }),
      });

      const { addPlayerHandler } = await import("./roster");

      await expect(
        addPlayerHandler(mockCtx, {
          leagueId: "league-1" as any,
          userId: "user-2" as any,
          teamId: "t1" as any,
          playerName: "Alice",
          playerEmail: "alice@test.com",
        }),
      ).rejects.toThrow();
    });
  });

  describe("removePlayerHandler", () => {
    it("deletes the player record", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "p1") return { _id: "p1", userId: "u1", teamId: "t1", status: "active" };
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        return null;
      });

      const { removePlayerHandler } = await import("./roster");

      await removePlayerHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        playerId: "p1" as any,
      });

      expect(deletedIds).toContain("p1");
    });

    it("clears captainId when removing the team captain", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "p1") return { _id: "p1", userId: "u1", teamId: "t1", status: "active" };
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles", captainId: "p1" };
        return null;
      });

      const { removePlayerHandler } = await import("./roster");

      await removePlayerHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        playerId: "p1" as any,
      });

      expect(patchedDocs).toContainEqual({
        id: "t1",
        values: { captainId: undefined },
      });
      expect(deletedIds).toContain("p1");
    });
  });

  describe("setPlayerStatusHandler", () => {
    it("patches player status to inactive", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "p1") return { _id: "p1", userId: "u1", teamId: "t1", status: "active" };
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        return null;
      });

      const { setPlayerStatusHandler } = await import("./roster");

      await setPlayerStatusHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        playerId: "p1" as any,
        status: "inactive",
      });

      expect(patchedDocs).toContainEqual({
        id: "p1",
        values: { status: "inactive" },
      });
    });

    it("patches player status to active", async () => {
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "p1") return { _id: "p1", userId: "u1", teamId: "t1", status: "inactive" };
        if (id === "t1") return { _id: "t1", leagueId: "league-1", name: "Eagles" };
        return null;
      });

      const { setPlayerStatusHandler } = await import("./roster");

      await setPlayerStatusHandler(mockCtx, {
        leagueId: "league-1" as any,
        userId: "user-1" as any,
        playerId: "p1" as any,
        status: "active",
      });

      expect(patchedDocs).toContainEqual({
        id: "p1",
        values: { status: "active" },
      });
    });
  });
});
