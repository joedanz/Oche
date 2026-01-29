// ABOUTME: Tests for the league layout with league switcher.
// ABOUTME: Validates switcher rendering, league switching via navigation, and active league display.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LeagueLayout } from "./LeagueLayout";

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
  },
}));

import { useQuery } from "convex/react";

const leagues = [
  { leagueId: "l1", leagueName: "Thursday Night Darts", role: "admin" },
  { leagueId: "l2", leagueName: "Sunday Funday", role: "player" },
];

function renderWithRoute(leagueId: string) {
  return render(
    <MemoryRouter initialEntries={[`/leagues/${leagueId}`]}>
      <Routes>
        <Route path="/leagues/:leagueId" element={<LeagueLayout />}>
          <Route index element={<div>League Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("LeagueLayout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useQuery as any).mockReturnValue(leagues);
  });

  afterEach(cleanup);

  it("renders the active league name in the header", () => {
    renderWithRoute("l1");
    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("Thursday Night Darts");
  });

  it("renders a league switcher dropdown with all leagues", () => {
    renderWithRoute("l1");
    const switcher = screen.getByRole("combobox", { name: /switch league/i });
    expect(switcher).toBeInTheDocument();
  });

  it("shows the current league as selected in the switcher", () => {
    renderWithRoute("l1");
    const switcher = screen.getByRole("combobox", {
      name: /switch league/i,
    }) as HTMLSelectElement;
    expect(switcher.value).toBe("l1");
  });

  it("navigates to different league when switcher value changes", async () => {
    const user = userEvent.setup();
    renderWithRoute("l1");
    const switcher = screen.getByRole("combobox", { name: /switch league/i });
    await user.selectOptions(switcher, "l2");
    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("Sunday Funday");
  });

  it("renders child route content via Outlet", () => {
    renderWithRoute("l1");
    expect(screen.getByText("League Home")).toBeInTheDocument();
  });

  it("has a link back to the dashboard", () => {
    renderWithRoute("l1");
    expect(
      screen.getByRole("link", { name: /my leagues/i }),
    ).toBeInTheDocument();
  });
});
