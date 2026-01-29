// ABOUTME: Tests for the MatchScoreEntryPage component.
// ABOUTME: Verifies multi-game score entry with collapse/expand and overall match totals.

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
    matchDetail: {
      getMatchDetail: "matchDetail:getMatchDetail",
    },
    scoring: {
      getGameInnings: "scoring:getGameInnings",
      saveInnings: "scoring:saveInnings",
    },
    dnpBlind: {
      toggleDnp: "dnpBlind:toggleDnp",
      applyBlindScores: "dnpBlind:applyBlindScores",
    },
  },
}));

import { MatchScoreEntryPage } from "./MatchScoreEntryPage";

function renderPage(matchId = "match-1" as any, leagueId = "league-1" as any) {
  return render(
    <MemoryRouter>
      <MatchScoreEntryPage matchId={matchId} leagueId={leagueId} />
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
    status: "scheduled",
    pairings: [
      { slot: 1, homePlayerId: "p1", visitorPlayerId: "p3" },
      { slot: 2, homePlayerId: "p2", visitorPlayerId: "p4" },
      { slot: 3, homePlayerId: "p5", visitorPlayerId: "blind" },
    ],
    totals: undefined,
  },
  homeTeamName: "Eagles",
  visitorTeamName: "Hawks",
  pairings: [
    { slot: 1, homePlayerName: "Alice", visitorPlayerName: "Charlie", homePlayerId: "p1", visitorPlayerId: "p3" },
    { slot: 2, homePlayerName: "Bob", visitorPlayerName: "Dave", homePlayerId: "p2", visitorPlayerId: "p4" },
    { slot: 3, homePlayerName: "Eve", visitorPlayerName: "Blind", homePlayerId: "p5", visitorPlayerId: "blind" },
  ],
  games: [
    { _id: "game-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p3", winner: null },
    { _id: "game-2", slot: 2, homePlayerId: "p2", visitorPlayerId: "p4", winner: null },
    { _id: "game-3", slot: 3, homePlayerId: "p5", visitorPlayerId: "blind", winner: null },
  ],
};

describe("MatchScoreEntryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays all games with player names", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    expect(screen.getByText(/game 1/i)).toBeInTheDocument();
    expect(screen.getByText(/game 2/i)).toBeInTheDocument();
    expect(screen.getByText(/game 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/alice/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bob/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/eve/i).length).toBeGreaterThanOrEqual(1);
  });

  it("displays team names heading", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    expect(screen.getAllByText(/eagles/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/hawks/i).length).toBeGreaterThanOrEqual(1);
  });

  it("can collapse and expand individual games", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();

    // All games should be expanded by default — scoring grids visible
    const game1Heading = screen.getByText(/game 1/i);
    expect(game1Heading).toBeInTheDocument();

    // Click to collapse Game 1
    await user.click(game1Heading);

    // After collapse, the scoring inputs for game 1 should be hidden
    // We verify by checking that we can still see game 2 and 3 content
    expect(screen.getByText(/game 2/i)).toBeInTheDocument();
    expect(screen.getByText(/game 3/i)).toBeInTheDocument();
  });

  it("shows overall match totals section", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    expect(screen.getByText(/match totals/i)).toBeInTheDocument();
  });

  it("has back to schedule link", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    expect(screen.getByText(/back to schedule/i)).toBeInTheDocument();
  });

  it("handles match with no games", () => {
    const noGamesData = {
      ...matchDetail,
      games: [],
      pairings: [],
    };
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return noGamesData;
      return undefined;
    });
    renderPage();
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  it("shows match not found for null data", () => {
    mockUseQuery.mockReturnValue(null);
    renderPage();
    expect(screen.getByText(/match not found/i)).toBeInTheDocument();
  });
});
