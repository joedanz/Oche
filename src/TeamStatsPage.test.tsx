// ABOUTME: Tests for the TeamStatsPage component.
// ABOUTME: Validates rendering of team stats summary, roster with per-player stats.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TeamStatsPage } from "./TeamStatsPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    teamStats: { getTeamStats: "teamStats:getTeamStats" },
  },
}));

import { useQuery } from "convex/react";

function renderPage(props?: { teamId?: string; leagueId?: string }) {
  return render(
    <MemoryRouter>
      <TeamStatsPage
        leagueId={(props?.leagueId ?? "league1") as any}
        teamId={(props?.teamId ?? "team1") as any}
      />
    </MemoryRouter>,
  );
}

const fullData = {
  teamName: "Team Alpha",
  gameWins: 15,
  totalRunsScored: 500,
  totalRunsAllowed: 380,
  matchPoints: 18,
  teamPlusMinus: 120,
  seasons: [
    { id: "season1", name: "Spring 2026", isActive: true },
    { id: "season2", name: "Fall 2025", isActive: false },
  ],
  roster: [
    {
      playerId: "p1",
      name: "Alice Johnson",
      gamesPlayed: 10,
      wins: 7,
      losses: 3,
      totalPlus: 300,
      totalMinus: 180,
      highInnings: 5,
      average: 30,
    },
    {
      playerId: "p2",
      name: "Bob Smith",
      gamesPlayed: 8,
      wins: 5,
      losses: 3,
      totalPlus: 200,
      totalMinus: 200,
      highInnings: 1,
      average: 25,
    },
  ],
};

describe("TeamStatsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(cleanup);

  it("shows loading state when data is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays team name as heading", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByRole("heading", { name: /team alpha/i })).toBeInTheDocument();
  });

  it("displays team aggregate stats", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("15")).toBeInTheDocument(); // game wins
    expect(screen.getByText("500")).toBeInTheDocument(); // runs scored
    expect(screen.getByText("380")).toBeInTheDocument(); // runs allowed
    expect(screen.getByText("18")).toBeInTheDocument(); // match points
    expect(screen.getAllByText("+120")).toHaveLength(2); // team plus/minus + Alice's +/−
  });

  it("renders roster table with per-player stats", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("30.00")).toBeInTheDocument(); // Alice average
    expect(screen.getByText("25.00")).toBeInTheDocument(); // Bob average
    expect(screen.getByText("7-3")).toBeInTheDocument(); // Alice W-L
  });

  it("shows season selector with all seasons", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });

  it("shows empty state when no stats and no roster", () => {
    (useQuery as any).mockReturnValue({
      ...fullData,
      gameWins: 0,
      totalRunsScored: 0,
      totalRunsAllowed: 0,
      matchPoints: 0,
      teamPlusMinus: 0,
      roster: [],
    });
    renderPage();
    expect(screen.getByText(/no players/i)).toBeInTheDocument();
  });
});
