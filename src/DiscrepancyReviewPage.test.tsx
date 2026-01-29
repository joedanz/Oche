// ABOUTME: Tests for the DiscrepancyReviewPage component.
// ABOUTME: Verifies admin can view and resolve score entry discrepancies.

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
    dualEntry: {
      getScoreEntries: "dualEntry:getScoreEntries",
      resolveDiscrepancy: "dualEntry:resolveDiscrepancy",
    },
  },
}));

import { DiscrepancyReviewPage } from "./DiscrepancyReviewPage";

function renderPage(gameId = "game-1" as any, leagueId = "league-1" as any) {
  return render(
    <MemoryRouter>
      <DiscrepancyReviewPage gameId={gameId} leagueId={leagueId} />
    </MemoryRouter>,
  );
}

const homeInnings = [
  { inningNumber: 1, batter: "home", runs: 5, isExtra: false },
  { inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
];
const visitorInnings = [
  { inningNumber: 1, batter: "home", runs: 9, isExtra: false },
  { inningNumber: 1, batter: "visitor", runs: 3, isExtra: false },
];

const discrepancyEntries = [
  { _id: "se-1", side: "home", submittedBy: "user-1", innings: homeInnings, status: "discrepancy" },
  { _id: "se-2", side: "visitor", submittedBy: "user-2", innings: visitorInnings, status: "discrepancy" },
];

describe("DiscrepancyReviewPage", () => {
  let mockResolve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockResolve = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockResolve);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows no entries message when empty", () => {
    mockUseQuery.mockReturnValue([]);
    renderPage();
    expect(screen.getByText(/no score entries/i)).toBeInTheDocument();
  });

  it("displays both entries side by side when discrepancy", () => {
    mockUseQuery.mockReturnValue(discrepancyEntries);
    renderPage();
    expect(screen.getByText(/home entry/i)).toBeInTheDocument();
    expect(screen.getByText(/visitor entry/i)).toBeInTheDocument();
    expect(screen.getByText(/discrepancy/i)).toBeInTheDocument();
  });

  it("highlights differing innings", () => {
    mockUseQuery.mockReturnValue(discrepancyEntries);
    renderPage();
    // Home says 5 for inning 1 home batter, visitor says 9
    // Both values should be visible
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("shows accept home / accept visitor buttons", () => {
    mockUseQuery.mockReturnValue(discrepancyEntries);
    renderPage();
    expect(screen.getByRole("button", { name: /accept home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept visitor/i })).toBeInTheDocument();
  });

  it("calls resolve mutation when accepting home entry", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue(discrepancyEntries);
    renderPage();

    await user.click(screen.getByRole("button", { name: /accept home/i }));
    expect(mockResolve).toHaveBeenCalledWith({
      gameId: "game-1",
      leagueId: "league-1",
      chosenSide: "home",
    });
  });

  it("shows confirmed status when entries match", () => {
    const confirmedEntries = [
      { _id: "se-1", side: "home", submittedBy: "user-1", innings: homeInnings, status: "confirmed" },
      { _id: "se-2", side: "visitor", submittedBy: "user-2", innings: homeInnings, status: "confirmed" },
    ];
    mockUseQuery.mockReturnValue(confirmedEntries);
    renderPage();
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it("shows pending status when only one entry exists", () => {
    const singleEntry = [
      { _id: "se-1", side: "home", submittedBy: "user-1", innings: homeInnings, status: "pending" },
    ];
    mockUseQuery.mockReturnValue(singleEntry);
    renderPage();
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
  });
});
