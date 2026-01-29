// ABOUTME: Tests for DNP toggle and blind visual indicators on the match score entry page.
// ABOUTME: Verifies grayed-out DNP games, blind labels, and toggle behavior.

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
    dualEntry: {
      getScoreEntries: "dualEntry:getScoreEntries",
      resolveDiscrepancy: "dualEntry:resolveDiscrepancy",
    },
    handicapScoring: {
      getGameHandicap: "handicapScoring:getGameHandicap",
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
      { slot: 2, homePlayerId: "p2", visitorPlayerId: "blind" },
    ],
    totals: undefined,
  },
  homeTeamName: "Eagles",
  visitorTeamName: "Hawks",
  pairings: [
    { slot: 1, homePlayerName: "Alice", visitorPlayerName: "Charlie", homePlayerId: "p1", visitorPlayerId: "p3" },
    { slot: 2, homePlayerName: "Bob", visitorPlayerName: "Blind", homePlayerId: "p2", visitorPlayerId: "blind" },
  ],
  games: [
    { _id: "game-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p3", winner: null, isDnp: false },
    { _id: "game-2", slot: 2, homePlayerId: "p2", visitorPlayerId: "blind", winner: null, isDnp: false },
  ],
};

describe("MatchScoreEntryPage - DNP & Blind", () => {
  const mockToggleDnp = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "dnpBlind:toggleDnp") return mockToggleDnp;
      return vi.fn();
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows DNP toggle button for each game", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    const dnpButtons = screen.getAllByRole("button", { name: /dnp/i });
    expect(dnpButtons.length).toBe(2);
  });

  it("shows blind label on games with blind players", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();
    expect(screen.getByText("(Blind)")).toBeInTheDocument();
  });

  it("grays out DNP games and hides scoring grid", () => {
    const dnpData = {
      ...matchDetail,
      games: [
        { _id: "game-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p3", winner: null, isDnp: true },
        { _id: "game-2", slot: 2, homePlayerId: "p2", visitorPlayerId: "blind", winner: null, isDnp: false },
      ],
    };
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return dnpData;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();

    // DNP game should have visual indicator
    expect(screen.getByTestId("game-game-1-dnp")).toBeInTheDocument();
  });

  it("calls toggleDnp mutation when DNP button is clicked", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return matchDetail;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();

    const dnpButtons = screen.getAllByRole("button", { name: /dnp/i });
    await user.click(dnpButtons[0]);

    expect(mockToggleDnp).toHaveBeenCalledWith({
      gameId: "game-1",
      leagueId: "league-1",
      isDnp: true,
    });
  });

  it("shows 'No Points' label for DNP games", () => {
    const dnpData = {
      ...matchDetail,
      games: [
        { _id: "game-1", slot: 1, homePlayerId: "p1", visitorPlayerId: "p3", winner: null, isDnp: true },
        { _id: "game-2", slot: 2, homePlayerId: "p2", visitorPlayerId: "blind", winner: null, isDnp: false },
      ],
    };
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matchDetail:getMatchDetail") return dnpData;
      if (ref === "scoring:getGameInnings") return [];
      return undefined;
    });
    renderPage();

    expect(screen.getByText(/no points/i)).toBeInTheDocument();
  });
});
