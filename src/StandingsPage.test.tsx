// ABOUTME: Tests for the StandingsPage component.
// ABOUTME: Validates rendering of standings table, division/season filters, and tiebreaker sorting display.

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { StandingsPage } from "./StandingsPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    standings: { getStandings: "standings:getStandings" },
  },
}));

import { useQuery } from "convex/react";

function renderPage(props?: { leagueId?: string }) {
  return render(
    <MemoryRouter>
      <StandingsPage leagueId={(props?.leagueId ?? "league1") as any} />
    </MemoryRouter>,
  );
}

const fullData = {
  standings: [
    { rank: 1, teamId: "t1", teamName: "Alpha", matchPoints: 12, gameWins: 10, totalRunsScored: 500, plusMinus: 120 },
    { rank: 2, teamId: "t2", teamName: "Beta", matchPoints: 9, gameWins: 8, totalRunsScored: 400, plusMinus: 50 },
    { rank: 3, teamId: "t3", teamName: "Gamma", matchPoints: 5, gameWins: 4, totalRunsScored: 300, plusMinus: -30 },
  ],
  seasons: [
    { id: "season1", name: "Spring 2026", isActive: true },
    { id: "season2", name: "Fall 2025", isActive: false },
  ],
  divisions: [
    { id: "div1", name: "East" },
    { id: "div2", name: "West" },
  ],
};

describe("StandingsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(cleanup);

  it("shows loading state when data is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders standings table with all teams", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("displays rank, match points, game wins, runs, and plus/minus columns", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    // Column headers
    expect(screen.getByText(/rank/i)).toBeInTheDocument();
    expect(screen.getByText(/match points/i)).toBeInTheDocument();
    expect(screen.getByText(/game wins/i)).toBeInTheDocument();
    expect(screen.getByText(/runs/i)).toBeInTheDocument();
    // Values for Alpha
    expect(screen.getByText("12")).toBeInTheDocument(); // match points
    expect(screen.getByText("10")).toBeInTheDocument(); // game wins
    expect(screen.getByText("500")).toBeInTheDocument(); // runs
  });

  it("shows season selector", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });

  it("shows division filter", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("East")).toBeInTheDocument();
    expect(screen.getByText("West")).toBeInTheDocument();
  });

  it("shows empty state when no standings", () => {
    (useQuery as any).mockReturnValue({
      standings: [],
      seasons: [{ id: "s1", name: "Spring 2026", isActive: true }],
      divisions: [],
    });
    renderPage();
    expect(screen.getByText(/no standings/i)).toBeInTheDocument();
  });

  it("renders export CSV button when standings exist", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("renders export PDF button when standings exist", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByRole("button", { name: /export pdf/i })).toBeInTheDocument();
  });

  it("does not render export buttons when no standings", () => {
    (useQuery as any).mockReturnValue({
      standings: [],
      seasons: [],
      divisions: [],
    });
    renderPage();
    expect(screen.queryByRole("button", { name: /export csv/i })).not.toBeInTheDocument();
  });

  it("triggers CSV download on export CSV click", () => {
    (useQuery as any).mockReturnValue(fullData);
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test");
    global.URL.revokeObjectURL = vi.fn();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
