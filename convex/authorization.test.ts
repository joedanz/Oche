// ABOUTME: Tests for role-based authorization helpers.
// ABOUTME: Validates role checks, league membership verification, and error messages.

import { describe, it, expect, vi } from "vitest";

import {
  getMemberRole,
  requireLeagueMember,
  requireRole,
  AuthorizationError,
} from "./authorization";

const userId = "user123" as any;
const leagueId = "league456" as any;

function makeMockDb(membership: { role: string } | null) {
  return {
    query: vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnValue({
        unique: vi.fn().mockResolvedValue(
          membership
            ? { userId, leagueId, role: membership.role }
            : null,
        ),
      }),
    }),
  };
}

describe("getMemberRole", () => {
  it("returns the role when user is a member", async () => {
    const db = makeMockDb({ role: "admin" });
    const role = await getMemberRole(db as any, userId, leagueId);
    expect(role).toBe("admin");
  });

  it("returns null when user is not a member", async () => {
    const db = makeMockDb(null);
    const role = await getMemberRole(db as any, userId, leagueId);
    expect(role).toBeNull();
  });
});

describe("requireLeagueMember", () => {
  it("returns membership when user is a member", async () => {
    const db = makeMockDb({ role: "player" });
    const membership = await requireLeagueMember(db as any, userId, leagueId);
    expect(membership.role).toBe("player");
  });

  it("throws AuthorizationError when user is not a member", async () => {
    const db = makeMockDb(null);
    await expect(
      requireLeagueMember(db as any, userId, leagueId),
    ).rejects.toThrow(AuthorizationError);
    await expect(
      requireLeagueMember(db as any, userId, leagueId),
    ).rejects.toThrow("Not a member of this league");
  });
});

describe("requireRole", () => {
  it("passes when user has the required role", async () => {
    const db = makeMockDb({ role: "admin" });
    const membership = await requireRole(db as any, userId, leagueId, [
      "admin",
    ]);
    expect(membership.role).toBe("admin");
  });

  it("passes when user has one of multiple allowed roles", async () => {
    const db = makeMockDb({ role: "captain" });
    const membership = await requireRole(db as any, userId, leagueId, [
      "admin",
      "captain",
    ]);
    expect(membership.role).toBe("captain");
  });

  it("throws when user lacks the required role", async () => {
    const db = makeMockDb({ role: "player" });
    await expect(
      requireRole(db as any, userId, leagueId, ["admin"]),
    ).rejects.toThrow(AuthorizationError);
    await expect(
      requireRole(db as any, userId, leagueId, ["admin"]),
    ).rejects.toThrow("Insufficient permissions");
  });

  it("throws when user is not a member at all", async () => {
    const db = makeMockDb(null);
    await expect(
      requireRole(db as any, userId, leagueId, ["admin"]),
    ).rejects.toThrow("Not a member of this league");
  });

  it("player role is rejected from admin/captain operations", async () => {
    const db = makeMockDb({ role: "player" });
    await expect(
      requireRole(db as any, userId, leagueId, ["admin", "captain"]),
    ).rejects.toThrow("Insufficient permissions");
  });
});
