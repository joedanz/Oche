// ABOUTME: Tests for dashboard backend queries.
// ABOUTME: Validates getUserLeaguesWithDetails returns league info joined with membership role.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserLeaguesWithDetailsHandler } from "./dashboard";

describe("getUserLeaguesWithDetailsHandler", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns leagues with name and role for a user", async () => {
    const userId = "user1" as any;
    const leagueId = "league1" as any;

    const memberships = [{ userId, leagueId, role: "admin" }];
    const league = { _id: leagueId, name: "Thursday Night Darts" };

    mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(memberships),
        }),
      }),
      get: vi.fn().mockResolvedValue(league),
    };

    const result = await getUserLeaguesWithDetailsHandler(
      { db: mockDb },
      { userId },
    );

    expect(result).toEqual([
      {
        leagueId,
        leagueName: "Thursday Night Darts",
        role: "admin",
      },
    ]);
  });

  it("returns empty array when user has no leagues", async () => {
    const userId = "user1" as any;

    mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const result = await getUserLeaguesWithDetailsHandler(
      { db: mockDb },
      { userId },
    );

    expect(result).toEqual([]);
  });

  it("skips memberships where league no longer exists", async () => {
    const userId = "user1" as any;

    const memberships = [
      { userId, leagueId: "league1" as any, role: "admin" },
      { userId, leagueId: "league2" as any, role: "player" },
    ];

    mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(memberships),
        }),
      }),
      get: vi
        .fn()
        .mockResolvedValueOnce({ _id: "league1", name: "League A" })
        .mockResolvedValueOnce(null),
    };

    const result = await getUserLeaguesWithDetailsHandler(
      { db: mockDb },
      { userId },
    );

    expect(result).toEqual([
      { leagueId: "league1", leagueName: "League A", role: "admin" },
    ]);
  });
});
