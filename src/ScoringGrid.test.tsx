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

  it("shows 'Add Extra Inning' button when regulation innings are tied", async () => {
    // All 9 innings entered, both sides have equal total runs
    const tiedInnings = [];
    for (let i = 1; i <= 9; i++) {
      tiedInnings.push({ inningNumber: i, batter: "home", runs: 3, isExtra: false });
      tiedInnings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(tiedInnings);
    renderGrid();
    expect(screen.getByRole("button", { name: /add extra inning/i })).toBeInTheDocument();
  });

  it("does not show 'Add Extra Inning' button when not tied", async () => {
    const notTied = [];
    for (let i = 1; i <= 9; i++) {
      notTied.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      notTied.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(notTied);
    renderGrid();
    expect(screen.queryByRole("button", { name: /add extra inning/i })).not.toBeInTheDocument();
  });

  it("adds an extra inning column when button is clicked", async () => {
    const tiedInnings = [];
    for (let i = 1; i <= 9; i++) {
      tiedInnings.push({ inningNumber: i, batter: "home", runs: 3, isExtra: false });
      tiedInnings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(tiedInnings);
    renderGrid();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /add extra inning/i }));
    // Should now have 10 columns (9 regular + 1 extra) = 20 inputs
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(20);
  });

  it("renders extra inning columns with visual distinction", async () => {
    const tiedInnings = [];
    for (let i = 1; i <= 9; i++) {
      tiedInnings.push({ inningNumber: i, batter: "home", runs: 3, isExtra: false });
      tiedInnings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(tiedInnings);
    renderGrid();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /add extra inning/i }));
    // Extra inning header should show "E1" or "10" with distinct styling
    expect(screen.getByText(/e1/i)).toBeInTheDocument();
  });

  it("displays Plus, Minus, and Total columns", () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    expect(screen.getByText("Plus")).toBeInTheDocument();
    expect(screen.getByText("Minus")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("calculates Plus as sum of own regulation batting runs", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Home plus = 9 * 5 = 45, Visitor plus = 9 * 3 = 27
    expect(screen.getByTestId("home-plus")).toHaveTextContent("45");
    expect(screen.getByTestId("visitor-plus")).toHaveTextContent("27");
  });

  it("calculates Minus as sum of opponent regulation batting runs", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Home minus = visitor's runs = 27, Visitor minus = home's runs = 45
    expect(screen.getByTestId("home-minus")).toHaveTextContent("27");
    expect(screen.getByTestId("visitor-minus")).toHaveTextContent("45");
  });

  it("calculates Total as Plus minus Minus", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Home total = 45 - 27 = 18, Visitor total = 27 - 45 = -18
    expect(screen.getByTestId("home-total")).toHaveTextContent("18");
    expect(screen.getByTestId("visitor-total")).toHaveTextContent("-18");
  });

  it("excludes extra innings from Plus/Minus/Total calculations", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 5, isExtra: false });
    }
    // Add extra innings that should NOT affect totals
    innings.push({ inningNumber: 10, batter: "home", runs: 9, isExtra: true });
    innings.push({ inningNumber: 10, batter: "visitor", runs: 2, isExtra: true });
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Plus should still be 45 for both (extras excluded)
    expect(screen.getByTestId("home-plus")).toHaveTextContent("45");
    expect(screen.getByTestId("visitor-plus")).toHaveTextContent("45");
    expect(screen.getByTestId("home-total")).toHaveTextContent("0");
    expect(screen.getByTestId("visitor-total")).toHaveTextContent("0");
  });

  it("updates totals in real-time as runs are entered", async () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    const user = userEvent.setup();
    // Enter 5 in home inning 1
    await user.click(inputs[0]);
    await user.keyboard("5");
    expect(screen.getByTestId("home-plus")).toHaveTextContent("5");
    expect(screen.getByTestId("visitor-minus")).toHaveTextContent("5");
  });

  it("loads existing extra innings from data", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 3, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    innings.push({ inningNumber: 10, batter: "home", runs: 7, isExtra: true });
    innings.push({ inningNumber: 10, batter: "visitor", runs: 2, isExtra: true });
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Should show extra inning column with data
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(20);
    // Inputs are ordered by row: home[0..9], visitor[0..9]
    // Extra inning home value = 7 (index 9 = 10th home cell)
    expect(inputs[9]).toHaveValue(7);
    // Extra inning visitor value = 2 (index 19 = 10th visitor cell)
    expect(inputs[19]).toHaveValue(2);
  });

  it("highlights 9-run innings with a visual indicator", () => {
    const innings = [
      { inningNumber: 1, batter: "home", runs: 9, isExtra: false },
      { inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
      { inningNumber: 2, batter: "home", runs: 5, isExtra: false },
      { inningNumber: 2, batter: "visitor", runs: 9, isExtra: false },
    ];
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    // Home inning 1 = 9 → should be highlighted
    expect(inputs[0].closest("td")).toHaveAttribute("data-high-inning", "true");
    // Home inning 2 = 5 → should NOT be highlighted
    expect(inputs[1].closest("td")).not.toHaveAttribute("data-high-inning");
    // Visitor inning 1 = 3 → should NOT be highlighted
    expect(inputs[9].closest("td")).not.toHaveAttribute("data-high-inning");
    // Visitor inning 2 = 9 → should be highlighted
    expect(inputs[10].closest("td")).toHaveAttribute("data-high-inning", "true");
  });

  it("highlights 9-run innings entered interactively", async () => {
    mockUseQuery.mockReturnValue([]);
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    const user = userEvent.setup();
    await user.click(inputs[0]);
    await user.keyboard("9");
    expect(inputs[0].closest("td")).toHaveAttribute("data-high-inning", "true");
  });

  it("displays high innings count per player on the grid", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: i <= 3 ? 9 : 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: i === 1 ? 9 : 4, isExtra: false });
    }
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    // Home has 3 high innings (innings 1-3), visitor has 1 (inning 1)
    expect(screen.getByTestId("home-high-innings")).toHaveTextContent("3");
    expect(screen.getByTestId("visitor-high-innings")).toHaveTextContent("1");
  });

  it("shows 0 high innings when no 9-run innings exist", () => {
    const innings = [];
    for (let i = 1; i <= 9; i++) {
      innings.push({ inningNumber: i, batter: "home", runs: 5, isExtra: false });
      innings.push({ inningNumber: i, batter: "visitor", runs: 3, isExtra: false });
    }
    mockUseQuery.mockReturnValue(innings);
    renderGrid();
    expect(screen.getByTestId("home-high-innings")).toHaveTextContent("0");
    expect(screen.getByTestId("visitor-high-innings")).toHaveTextContent("0");
  });
});
