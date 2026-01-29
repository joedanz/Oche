// ABOUTME: Tests for the MatchDetailPage component.
// ABOUTME: Verifies display of match details, pairings, game results, and totals.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    matchDetail: {
      getMatchDetail: "matchDetail:getMatchDetail",
    },
  },
}));

import { MatchDetailPage } from "./MatchDetailPage";

function renderPage(matchId = "match-1" as any, leagueId = "league-1" as any) {
  return render(
    <MemoryRouter>
      <MatchDetailPage matchId={matchId} leagueId={leagueId} />
    </MemoryRouter>,
  );
}

const matchDetail = {
  match: {
    _id: "match-1",
    leagueId: "league-1",
    homeTeamId: "team-1",
    visitorTeamId: "team-2",
    date: "2026-02-01",
    status: "completed",
    pairings: [
      { slot: 1, homePlayerId: "p1", visitorPlayerId: "p3" },
      { slot: 2, homePlayerId: "p2", visitorPlayerId: "blind" },
    ],
    totals: { homePlus: 45, visitorPlus: 38, bonusWinner: "home" },
  },
  homeTeamName: "Eagles",
  visitorTeamName: "Hawks",
  pairings: [
    { slot: 1, homePlayerName: "Alice", visitorPlayerName: "Charlie", homePlayerId: "p1", visitorPlayerId: "p3" },
    { slot: 2, homePlayerName: "Bob", visitorPlayerName: "Blind", homePlayerId: "p2", visitorPlayerId: "blind" },
  ],
  games: [
    { _id: "game-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p3", winner: "home" },
    { _id: "game-2", slot: 2, homePlayerId: "p2", visitorPlayerId: "blind", winner: "home" },
  ],
};

describe("MatchDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays team names and date", () => {
    mockUseQuery.mockReturnValue(matchDetail);
    renderPage();
    expect(screen.getAllByText(/eagles/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/hawks/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2026-02-01/)).toBeInTheDocument();
  });

  it("displays pairings with player names", () => {
    mockUseQuery.mockReturnValue(matchDetail);
    renderPage();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/charlie/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
    expect(screen.getByText(/blind/i)).toBeInTheDocument();
  });

  it("displays game results with winner indication", () => {
    mockUseQuery.mockReturnValue(matchDetail);
    renderPage();
    // There should be game entries showing winners
    const gameElements = screen.getAllByText(/game \d/i);
    expect(gameElements.length).toBeGreaterThanOrEqual(2);
  });

  it("displays match totals and bonus winner", () => {
    mockUseQuery.mockReturnValue(matchDetail);
    renderPage();
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/38/)).toBeInTheDocument();
    // Bonus winner indication
    expect(screen.getByText(/bonus/i)).toBeInTheDocument();
  });

  it("handles match with no games or totals", () => {
    const noGamesData = {
      ...matchDetail,
      match: { ...matchDetail.match, totals: undefined, status: "scheduled" },
      games: [],
      pairings: [],
    };
    mockUseQuery.mockReturnValue(noGamesData);
    renderPage();
    expect(screen.getByText(/eagles/i)).toBeInTheDocument();
    expect(screen.getByText(/hawks/i)).toBeInTheDocument();
  });
});
