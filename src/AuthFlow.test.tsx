// ABOUTME: Tests for auth flow integration (logout, session state)
// ABOUTME: Verifies Dashboard logout button and useAuth hook behavior
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";

const mockSignOut = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: mockSignOut }),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    dashboard: { getUserLeaguesWithDetails: "getUserLeaguesWithDetails" },
  },
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("Auth flow", () => {
  it("Dashboard renders a logout button", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: /log out|sign out/i }),
    ).toBeInTheDocument();
  });

  it("logout button calls signOut", async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: /log out|sign out/i }),
    );
    expect(mockSignOut).toHaveBeenCalled();
  });
});
