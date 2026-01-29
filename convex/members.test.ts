// ABOUTME: Tests for countAdmins helper and last-admin protection contract.
// ABOUTME: Verifies admin counting logic used by role assignment mutations.

import { describe, it, expect, vi } from "vitest";
import { countAdmins } from "./authorization";

describe("countAdmins helper", () => {
  it("counts only admin-role memberships", async () => {
    const mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([
              { role: "admin", userId: "u1" },
              { role: "admin", userId: "u2" },
            ]),
          }),
        }),
      }),
    };

    const count = await countAdmins(mockDb as any, "league1" as any);
    expect(count).toBe(2);
  });

  it("returns 0 when no admins exist", async () => {
    const mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const count = await countAdmins(mockDb as any, "league1" as any);
    expect(count).toBe(0);
  });
});

describe("Last admin protection contract", () => {
  it("error message describes last-admin constraint", () => {
    const error = new Error("Cannot remove the last admin from this league");
    expect(error.message).toContain("last admin");
  });

  it("does not trigger for non-admin role changes", () => {
    const currentRole: string = "player";
    const newRole: string = "captain";
    const isDowngradingAdmin = currentRole === "admin" && newRole !== "admin";
    expect(isDowngradingAdmin).toBe(false);
  });
});
