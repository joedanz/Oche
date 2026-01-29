// ABOUTME: Tests for the match scheduling page.
// ABOUTME: Verifies match listing, creation form, and validation display.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SchedulePage } from "./SchedulePage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    matches: {
      getMatches: "matches:getMatches",
      createMatch: "matches:createMatch",
    },
    teams: {
      getTeams: "teams:getTeams",
    },
    seasons: {
      getSeasons: "seasons:getSeasons",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockTeams = [
  { _id: "t1", leagueId: "league1", name: "Eagles", venue: "The Pub" },
  { _id: "t2", leagueId: "league1", name: "Hawks", venue: "Sports Bar" },
  { _id: "t3", leagueId: "league1", name: "Tigers", venue: "Lounge" },
];

const mockSeasons = [
  { _id: "s1", leagueId: "league1", name: "Spring 2026", startDate: "2026-01-01", endDate: "2026-06-30", isActive: true },
];

const mockMatches = [
  {
    _id: "match1",
    leagueId: "league1",
    seasonId: "s1",
    homeTeamId: "t1",
    visitorTeamId: "t2",
    date: "2026-02-15",
    status: "scheduled",
    pairings: [],
    homeTeamName: "Eagles",
    visitorTeamName: "Hawks",
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("SchedulePage", () => {
  const mockCreateMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "matches:createMatch") return mockCreateMutate;
      return vi.fn();
    });
  });

  function renderPage(matches = mockMatches, teams = mockTeams, seasons = mockSeasons) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "matches:getMatches") return matches;
      if (ref === "teams:getTeams") return teams;
      if (ref === "seasons:getSeasons") return seasons;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/schedule"]}>
        <SchedulePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders match list with team names and dates", () => {
    renderPage();
    // Team names appear in both match list and dropdowns, so use getAllByText
    expect(screen.getAllByText(/eagles/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/hawks/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2026-02-15/)).toBeInTheDocument();
  });

  it("renders create match form with team selectors", () => {
    renderPage();
    expect(screen.getByLabelText(/home team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/visitor team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create match/i })).toBeInTheDocument();
  });

  it("calls create mutation with form values", async () => {
    mockCreateMutate.mockResolvedValue("match-new");
    const user = userEvent.setup();
    renderPage([], mockTeams, mockSeasons);

    await user.selectOptions(screen.getByLabelText(/home team/i), "t1");
    await user.selectOptions(screen.getByLabelText(/visitor team/i), "t2");

    const dateInput = screen.getByLabelText(/date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-03-01");

    await user.click(screen.getByRole("button", { name: /create match/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        homeTeamId: "t1",
        visitorTeamId: "t2",
        date: "2026-03-01",
      }),
    );
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <SchedulePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no matches exist", () => {
    renderPage([]);
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("shows error when same team selected for both sides", async () => {
    const user = userEvent.setup();
    renderPage([], mockTeams, mockSeasons);

    await user.selectOptions(screen.getByLabelText(/home team/i), "t1");
    await user.selectOptions(screen.getByLabelText(/visitor team/i), "t1");

    const dateInput = screen.getByLabelText(/date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-03-01");

    await user.click(screen.getByRole("button", { name: /create match/i }));

    expect(screen.getByText(/cannot play against itself/i)).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
