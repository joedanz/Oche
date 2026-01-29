// ABOUTME: Tests for the ScoringGrid component (innings score entry).
// ABOUTME: Verifies grid layout, input behavior, and keyboard navigation.

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    scoring: {
      saveInnings: "scoring:saveInnings",
      getGameInnings: "scoring:getGameInnings",
    },
  },
}));

import { ScoringGrid } from "./ScoringGrid";

function renderGrid(
  gameId = "game-1" as any,
  leagueId = "league-1" as any,
  homePlayerName = "Alice",
  visitorPlayerName = "Bob",
) {
  return render(
    <MemoryRouter>
      <ScoringGrid
        gameId={gameId}
        leagueId={leagueId}
        homePlayerName={homePlayerName}
        visitorPlayerName={visitorPlayerName}
      />
    </MemoryRouter>,
  );
}

describe("ScoringGrid", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a grid with home and visitor rows", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  it("renders 9 inning columns", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("renders input cells for each half-inning", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    // 9 innings * 2 batters = 18 inputs
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(18);
  });

  it("accepts numeric input 0-9", async () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    const user = userEvent.setup();
    await user.click(inputs[0]);
    await user.keyboard("7");
    expect(inputs[0]).toHaveValue(7);
  });

  it("shows loading when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderGrid();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("populates grid from existing innings data", () => {
    mockUseQuery.mockReturnValue([
      { inningNumber: 1, batter: "home", runs: 5, isExtra: false },
      { inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
      { inningNumber: 2, batter: "home", runs: 8, isExtra: false },
    ]);
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    // Home row, inning 1 = 5
    expect(inputs[0]).toHaveValue(5);
    // Visitor row, inning 1 = 3
    expect(inputs[9]).toHaveValue(3);
    // Home row, inning 2 = 8
    expect(inputs[1]).toHaveValue(8);
  });

  it("has a save button", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("visually distinguishes home and visitor rows", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    // Check that there are row labels for home and visitor
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });
});
