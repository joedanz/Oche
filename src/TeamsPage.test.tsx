// ABOUTME: Tests for the team management page.
// ABOUTME: Verifies team listing, creation, editing, and empty/loading states.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TeamsPage } from "./TeamsPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    teams: {
      getTeams: "teams:getTeams",
      createTeam: "teams:createTeam",
      editTeam: "teams:editTeam",
    },
    divisions: {
      getDivisions: "divisions:getDivisions",
    },
    captains: {
      getTeamPlayers: "captains:getTeamPlayers",
      assignCaptain: "captains:assignCaptain",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockTeams = [
  { _id: "t1", leagueId: "league1", name: "Eagles", venue: "The Pub", divisionId: "d1" },
  { _id: "t2", leagueId: "league1", name: "Hawks", venue: "Sports Bar" },
];

const mockDivisions = [
  { _id: "d1", leagueId: "league1", name: "East" },
  { _id: "d2", leagueId: "league1", name: "West" },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("TeamsPage", () => {
  const mockCreateMutate = vi.fn();
  const mockEditMutate = vi.fn();
  const mockAssignCaptain = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "teams:createTeam") return mockCreateMutate;
      if (ref === "teams:editTeam") return mockEditMutate;
      if (ref === "captains:assignCaptain") return mockAssignCaptain;
      return vi.fn();
    });
  });

  function renderPage(teams = mockTeams, divisions = mockDivisions) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "teams:getTeams") return teams;
      if (ref === "divisions:getDivisions") return divisions;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/teams"]}>
        <TeamsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders team list with names and venues", () => {
    renderPage();
    expect(screen.getByText("Eagles")).toBeInTheDocument();
    expect(screen.getByText("Hawks")).toBeInTheDocument();
    expect(screen.getByText("The Pub")).toBeInTheDocument();
    expect(screen.getByText("Sports Bar")).toBeInTheDocument();
  });

  it("renders create team form", () => {
    renderPage();
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/venue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create team/i })).toBeInTheDocument();
  });

  it("calls create mutation with form values", async () => {
    mockCreateMutate.mockResolvedValue("team-new");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/team name/i), "Tigers");
    await user.type(screen.getByLabelText(/venue/i), "My Bar");
    await user.click(screen.getByRole("button", { name: /create team/i }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        name: "Tigers",
        venue: "My Bar",
      }),
    );
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <TeamsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no teams exist", () => {
    renderPage([]);
    expect(screen.getByText(/no teams/i)).toBeInTheDocument();
  });

  it("renders edit button for each team", () => {
    renderPage();
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    expect(editButtons).toHaveLength(2);
  });

  it("shows edit form when edit is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    expect(screen.getByLabelText(/edit team name/i)).toBeInTheDocument();
  });

  it("shows division selector in create form", () => {
    renderPage();
    const divisionSelect = screen.getByLabelText(/division/i);
    expect(divisionSelect).toBeInTheDocument();
  });

  it("shows captain name when team has a captain", () => {
    const teamsWithCaptain = [
      {
        _id: "t1",
        leagueId: "league1",
        name: "Eagles",
        venue: "The Pub",
        captainId: "p1",
        captainName: "Alice",
      },
    ];
    renderPage(teamsWithCaptain);
    expect(screen.getByText(/captain: alice/i)).toBeInTheDocument();
  });

  it("shows 'No captain' when team has no captain", () => {
    const teamsNoCaptain = [
      { _id: "t1", leagueId: "league1", name: "Eagles", venue: "The Pub" },
    ];
    renderPage(teamsNoCaptain);
    expect(screen.getByText(/no captain/i)).toBeInTheDocument();
  });

  it("shows Set Captain button for each team", () => {
    renderPage();
    const setCaptainButtons = screen.getAllByRole("button", { name: /set captain/i });
    expect(setCaptainButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows player selector when Set Captain is clicked", async () => {
    const user = userEvent.setup();
    // Mock players for the team
    mockUseQuery.mockImplementation((ref: string, args?: any) => {
      if (ref === "teams:getTeams") return mockTeams;
      if (ref === "divisions:getDivisions") return mockDivisions;
      if (ref === "captains:getTeamPlayers")
        return [
          { _id: "p1", userId: "u1", teamId: args?.teamId, status: "active", userName: "Alice" },
          { _id: "p2", userId: "u2", teamId: args?.teamId, status: "active", userName: "Bob" },
        ];
      return undefined;
    });
    render(
      <MemoryRouter initialEntries={["/leagues/league1/teams"]}>
        <TeamsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );

    const setCaptainButtons = screen.getAllByRole("button", { name: /set captain/i });
    await user.click(setCaptainButtons[0]);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
