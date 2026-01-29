// ABOUTME: Tests for the PlayerStatsPage component.
// ABOUTME: Validates rendering of player stats, season selector, and game-by-game history.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PlayerStatsPage } from "./PlayerStatsPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    playerStatsPage: { getPlayerPageData: "playerStatsPage:getPlayerPageData" },
    playerStats: { recalculateStats: "playerStats:recalculateStats" },
  },
}));

import { useQuery } from "convex/react";

function renderPage(props?: { playerId?: string; leagueId?: string }) {
  return render(
    <MemoryRouter>
      <PlayerStatsPage
        leagueId={(props?.leagueId ?? "league1") as any}
        playerId={(props?.playerId ?? "player1") as any}
      />
    </MemoryRouter>,
  );
}

const fullData = {
  playerName: "Alice Johnson",
  teamName: "Team Alpha",
  stats: {
    gamesPlayed: 10,
    wins: 7,
    losses: 3,
    totalPlus: 350,
    totalMinus: 200,
    highInnings: 5,
    average: 35,
  },
  gameHistory: [
    {
      gameId: "g1",
      matchDate: "2026-03-15",
      opponentName: "Bob Smith",
      side: "home" as const,
      plus: 42,
      minus: 30,
      total: 12,
      highInnings: 1,
      result: "win" as const,
    },
    {
      gameId: "g2",
      matchDate: "2026-03-08",
      opponentName: "Charlie Brown",
      side: "visitor" as const,
      plus: 28,
      minus: 35,
      total: -7,
      highInnings: 0,
      result: "loss" as const,
    },
  ],
  seasons: [
    { id: "season1", name: "Spring 2026", isActive: true },
    { id: "season2", name: "Fall 2025", isActive: false },
  ],
};

describe("PlayerStatsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(cleanup);

  it("shows loading state when data is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays player name and team", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
  });

  it("displays summary stats", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("35.00")).toBeInTheDocument(); // average
    expect(screen.getByText("350")).toBeInTheDocument(); // totalPlus
    expect(screen.getByText("200")).toBeInTheDocument(); // totalMinus
    expect(screen.getByText("+150")).toBeInTheDocument(); // plus/minus = 350 - 200
    expect(screen.getByText("5")).toBeInTheDocument(); // high innings
    expect(screen.getByText("7-3")).toBeInTheDocument(); // W-L
    expect(screen.getByText("10")).toBeInTheDocument(); // games played
  });

  it("renders game-by-game history table", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("Loss")).toBeInTheDocument();
  });

  it("shows season selector with all seasons", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });

  it("shows empty state when no stats available", () => {
    (useQuery as any).mockReturnValue({
      ...fullData,
      stats: null,
      gameHistory: [],
    });
    renderPage();
    expect(screen.getByText(/no stats/i)).toBeInTheDocument();
  });

  it("shows no games message when game history is empty but stats exist", () => {
    (useQuery as any).mockReturnValue({
      ...fullData,
      gameHistory: [],
    });
    renderPage();
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });
});
