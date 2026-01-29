// ABOUTME: Tests for TournamentScoringPage component.
// ABOUTME: Verifies bracket rendering with winner selection and championship display.

import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
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
    tournaments: {
      getTournamentDetail: "tournaments.getTournamentDetail",
    },
    tournamentScoring: {
      recordTournamentMatchResult: "tournamentScoring.recordTournamentMatchResult",
    },
  },
}));

import { TournamentScoringPage } from "./TournamentScoringPage";

function makeBracket4Teams(overrides: Record<number, any> = {}) {
  const base = [
    {
      matchIndex: 0,
      round: 1,
      participant1Id: "t1",
      participant1Name: "Alpha",
      participant1Seed: 1,
      participant2Id: "t2",
      participant2Name: "Beta",
      participant2Seed: 4,
      winnerId: null,
    },
    {
      matchIndex: 1,
      round: 1,
      participant1Id: "t3",
      participant1Name: "Gamma",
      participant1Seed: 2,
      participant2Id: "t4",
      participant2Name: "Delta",
      participant2Seed: 3,
      winnerId: null,
    },
    {
      matchIndex: 2,
      round: 2,
      participant1Id: null,
      participant1Name: null,
      participant1Seed: null,
      participant2Id: null,
      participant2Name: null,
      participant2Seed: null,
      winnerId: null,
    },
  ];
  for (const [idx, patch] of Object.entries(overrides)) {
    Object.assign(base[Number(idx)], patch);
  }
  return base;
}

describe("TournamentScoringPage", () => {
  const mockRecordResult = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(mockRecordResult);
  });

  afterEach(cleanup);

  function renderPage() {
    return render(
      <MemoryRouter>
        <TournamentScoringPage
          leagueId={"league-1" as any}
          tournamentId={"tour-1" as any}
        />
      </MemoryRouter>,
    );
  }

  it("renders bracket with participant names", () => {
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams(),
      status: "pending",
    });

    renderPage();
    expect(screen.getByText(/spring playoffs/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Beta/)).toBeInTheDocument();
  });

  it("shows select winner buttons for matches with both participants", () => {
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams(),
      status: "pending",
    });

    renderPage();
    // Each first-round match should have 2 clickable winner buttons
    const winButtons = screen.getAllByRole("button", { name: /select.*winner/i });
    expect(winButtons.length).toBe(4); // 2 per match × 2 matches
  });

  it("calls recordResult mutation when winner selected", async () => {
    mockRecordResult.mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams(),
      status: "pending",
    });

    renderPage();
    const winButtons = screen.getAllByRole("button", { name: /select.*winner/i });
    fireEvent.click(winButtons[0]); // Select Alpha as winner of match 0

    await waitFor(() => {
      expect(mockRecordResult).toHaveBeenCalledWith({
        leagueId: "league-1",
        tournamentId: "tour-1",
        matchIndex: 0,
        winnerId: "t1",
      });
    });
  });

  it("shows winner highlighted in bracket", () => {
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams({
        0: { winnerId: "t1" },
      }),
      status: "in_progress",
    });

    renderPage();
    // The winner name should have a winner indicator
    const match0 = screen.getByTestId("bracket-match-0");
    expect(match0).toHaveTextContent("Alpha");
    // Winner row should have visual distinction (we'll check for data attribute)
    expect(match0.querySelector("[data-winner]")).toBeInTheDocument();
  });

  it("displays champion when tournament is completed", () => {
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams({
        0: { winnerId: "t1" },
        1: { winnerId: "t3" },
        2: {
          participant1Id: "t1",
          participant1Name: "Alpha",
          participant1Seed: 1,
          participant2Id: "t3",
          participant2Name: "Gamma",
          participant2Seed: 2,
          winnerId: "t1",
        },
      }),
      status: "completed",
    });

    renderPage();
    expect(screen.getByText(/champion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/alpha/i).length).toBeGreaterThan(0);
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("does not show select buttons for matches already decided", () => {
    mockUseQuery.mockReturnValue({
      _id: "tour-1",
      name: "Spring Playoffs",
      rounds: 2,
      bracket: makeBracket4Teams({
        0: { winnerId: "t1" },
        1: { winnerId: "t3" },
        2: {
          participant1Id: "t1",
          participant1Name: "Alpha",
          participant1Seed: 1,
          participant2Id: "t3",
          participant2Name: "Gamma",
          participant2Seed: 2,
          winnerId: "t1",
        },
      }),
      status: "completed",
    });

    renderPage();
    const winButtons = screen.queryAllByRole("button", { name: /select.*winner/i });
    expect(winButtons.length).toBe(0);
  });
});
