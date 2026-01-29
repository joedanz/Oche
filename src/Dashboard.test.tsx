// ABOUTME: Tests for the user dashboard component.
// ABOUTME: Validates league list, role display, empty state, and create league navigation.

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    dashboard: { getUserLeaguesWithDetails: "getUserLeaguesWithDetails" },
    onboarding: { getUserLeagues: "getUserLeagues" },
  },
}));

import { useQuery } from "convex/react";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(cleanup);

  it("shows loading state while leagues are undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText(/my leagues/i)).toBeInTheDocument();
  });

  it("shows empty state when user has no leagues", () => {
    (useQuery as any).mockReturnValue([]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/you're not part of any leagues yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create a league/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /join a league/i }),
    ).toBeInTheDocument();
  });

  it("renders league cards with name and role", () => {
    (useQuery as any).mockReturnValue([
      { leagueId: "l1", leagueName: "Thursday Night Darts", role: "admin" },
      { leagueId: "l2", leagueName: "Sunday Funday", role: "player" },
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText("Thursday Night Darts")).toBeInTheDocument();
    expect(screen.getByText("Sunday Funday")).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/player/i)).toBeInTheDocument();
  });

  it("has a Create New League button", () => {
    (useQuery as any).mockReturnValue([
      { leagueId: "l1", leagueName: "League A", role: "admin" },
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /create new league/i }),
    ).toBeInTheDocument();
  });

  it("renders league cards as links to league pages", () => {
    (useQuery as any).mockReturnValue([
      { leagueId: "l1", leagueName: "League A", role: "admin" },
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /league a/i });
    expect(link).toHaveAttribute("href", "/leagues/l1");
  });

  it("has a log out button", () => {
    (useQuery as any).mockReturnValue([]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: /log out/i }),
    ).toBeInTheDocument();
  });
});
