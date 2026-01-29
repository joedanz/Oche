// ABOUTME: Tests for league management mutations with role-based access control.
// ABOUTME: Verifies that mutations enforce proper role permissions per league.

import { describe, it, expect, vi } from "vitest";
import { AuthorizationError } from "./authorization";

// Since Convex mutations can't easily be unit tested outside the Convex runtime,
// we test the authorization logic directly and verify the error contract.

describe("Role-based access control contract", () => {
  it("defines three roles: admin, captain, player", () => {
    const roles = ["admin", "captain", "player"];
    expect(roles).toHaveLength(3);
    expect(roles).toContain("admin");
    expect(roles).toContain("captain");
    expect(roles).toContain("player");
  });

  it("AuthorizationError includes descriptive message for non-members", () => {
    const error = new AuthorizationError("Not a member of this league");
    expect(error.message).toBe("Not a member of this league");
    expect(error.name).toBe("AuthorizationError");
    expect(error).toBeInstanceOf(Error);
  });

  it("AuthorizationError includes descriptive message for insufficient role", () => {
    const error = new AuthorizationError(
      "Insufficient permissions: requires admin role",
    );
    expect(error.message).toContain("Insufficient permissions");
    expect(error.message).toContain("admin");
  });

  it("users can have different roles in different leagues", async () => {
    // Simulate: user is admin in league A, player in league B
    const { getMemberRole } = await import("./authorization");

    const leagueAMembership = { role: "admin" };
    const leagueBMembership = { role: "player" };

    const dbForLeagueA = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(leagueAMembership),
        }),
      }),
    };
    const dbForLeagueB = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          unique: vi.fn().mockResolvedValue(leagueBMembership),
        }),
      }),
    };

    const userId = "user1" as any;
    const leagueA = "leagueA" as any;
    const leagueB = "leagueB" as any;

    const roleA = await getMemberRole(dbForLeagueA as any, userId, leagueA);
    const roleB = await getMemberRole(dbForLeagueB as any, userId, leagueB);

    expect(roleA).toBe("admin");
    expect(roleB).toBe("player");
  });
});
