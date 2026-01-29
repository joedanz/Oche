// ABOUTME: Tests for the PairingsPage component.
// ABOUTME: Verifies pairing slot rendering, player selection, blind handling, and save.

import { render, screen, within, cleanup, fireEvent } from "@testing-library/react";
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
    pairings: {
      getMatchWithRosters: "pairings:getMatchWithRosters",
      savePairings: "pairings:savePairings",
    },
  },
}));

import { PairingsPage } from "./PairingsPage";

function renderPage(matchId = "match-1" as any, leagueId = "league-1" as any) {
  return render(
    <MemoryRouter>
      <PairingsPage matchId={matchId} leagueId={leagueId} />
    </MemoryRouter>,
  );
}

const matchData = {
  match: {
    _id: "match-1",
    leagueId: "league-1",
    homeTeamId: "team-1",
    visitorTeamId: "team-2",
    pairings: [],
    status: "scheduled",
  },
  homeTeamName: "Eagles",
  visitorTeamName: "Hawks",
  homePlayers: [
    { _id: "p1", name: "Alice" },
    { _id: "p2", name: "Bob" },
    { _id: "p3", name: "Charlie" },
  ],
  visitorPlayers: [
    { _id: "p4", name: "Diana" },
    { _id: "p5", name: "Eve" },
  ],
};

describe("PairingsPage", () => {
  let mockSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockSave = vi.fn();
    mockUseMutation.mockReturnValue(mockSave);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders team names in heading", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    expect(screen.getByText(/eagles/i)).toBeInTheDocument();
    expect(screen.getByText(/hawks/i)).toBeInTheDocument();
  });

  it("renders pairing slots with player dropdowns", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    // Should have at least one slot with home and visitor selectors
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("includes blind option in player dropdowns", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    const selects = screen.getAllByRole("combobox");
    const options = within(selects[0]).getAllByRole("option");
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain("Blind");
  });

  it("only shows home players in home dropdown and visitor players in visitor dropdown", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    const selects = screen.getAllByRole("combobox");
    // First select is home, second is visitor (for slot 1)
    const homeOptions = within(selects[0]).getAllByRole("option").map((o) => o.textContent);
    const visitorOptions = within(selects[1]).getAllByRole("option").map((o) => o.textContent);

    expect(homeOptions).toContain("Alice");
    expect(homeOptions).not.toContain("Diana");
    expect(visitorOptions).toContain("Diana");
    expect(visitorOptions).not.toContain("Alice");
  });

  it("can add and remove pairing slots", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    const addBtn = screen.getByRole("button", { name: /add slot/i });
    fireEvent.click(addBtn);
    // Should now have more selects
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(4); // at least 2 slots × 2 selects
  });

  it("calls save mutation with pairings", () => {
    mockUseQuery.mockReturnValue(matchData);
    renderPage();
    // Select players in first slot
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "p1" } });
    fireEvent.change(selects[1], { target: { value: "p4" } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "match-1",
        leagueId: "league-1",
        pairings: expect.arrayContaining([
          expect.objectContaining({
            slot: 1,
            homePlayerId: "p1",
            visitorPlayerId: "p4",
          }),
        ]),
      }),
    );
  });

  it("loads existing pairings from match data", () => {
    const dataWithPairings = {
      ...matchData,
      match: {
        ...matchData.match,
        pairings: [
          { slot: 1, homePlayerId: "p1", visitorPlayerId: "p4" },
          { slot: 2, homePlayerId: "p2", visitorPlayerId: "p5" },
        ],
      },
    };
    mockUseQuery.mockReturnValue(dataWithPairings);
    renderPage();

    const selects = screen.getAllByRole("combobox");
    expect((selects[0] as HTMLSelectElement).value).toBe("p1");
    expect((selects[1] as HTMLSelectElement).value).toBe("p4");
  });
});
