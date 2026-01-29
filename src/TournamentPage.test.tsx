// ABOUTME: Tests for TournamentPage component.
// ABOUTME: Verifies create form, tournament list, and bracket visualization rendering.

import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("./usePlan", () => ({
  usePlan: () => ({ isLoading: false, canUse: () => true }),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    tournaments: {
      getTournaments: "tournaments.getTournaments",
      createTournament: "tournaments.createTournament",
      getTournamentDetail: "tournaments.getTournamentDetail",
    },
    teams: {
      getTeams: "teams.getTeams",
    },
  },
}));

import { TournamentPage } from "./TournamentPage";

describe("TournamentPage", () => {
  const mockCreateTournament = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(mockCreateTournament);
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "tournaments.getTournaments") return [];
      if (ref === "teams.getTeams")
        return [
          { _id: "t1", name: "Team Alpha" },
          { _id: "t2", name: "Team Beta" },
          { _id: "t3", name: "Team Gamma" },
          { _id: "t4", name: "Team Delta" },
        ];
      return undefined;
    });
  });

  afterEach(cleanup);

  function renderPage() {
    return render(
      <MemoryRouter>
        <TournamentPage leagueId={"league-1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders create form with heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /^tournaments$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /create tournament/i })).toBeInTheDocument();
  });

  it("shows teams as checkboxes", () => {
    renderPage();
    expect(screen.getByLabelText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Team Beta")).toBeInTheDocument();
  });

  it("shows empty state when no tournaments", () => {
    renderPage();
    expect(screen.getByText(/no tournaments yet/i)).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /create tournament/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it("validates minimum participants", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/spring playoffs/i), {
      target: { value: "Test Tourney" },
    });
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-04-15" },
    });
    fireEvent.click(screen.getByLabelText("Team Alpha"));
    fireEvent.click(screen.getByRole("button", { name: /create tournament/i }));
    expect(screen.getByText(/select at least 2 participants/i)).toBeInTheDocument();
  });

  it("calls createTournament on valid submit", async () => {
    mockCreateTournament.mockResolvedValue("t-new");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/spring playoffs/i), {
      target: { value: "Test Tourney" },
    });
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-04-15" },
    });
    fireEvent.click(screen.getByLabelText("Team Alpha"));
    fireEvent.click(screen.getByLabelText("Team Beta"));
    fireEvent.click(screen.getByRole("button", { name: /create tournament/i }));

    await waitFor(() => {
      expect(mockCreateTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Tourney",
          date: "2026-04-15",
          format: "single-elimination",
        }),
      );
    });
  });

  it("renders tournament list with view bracket button", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "tournaments.getTournaments")
        return [
          {
            _id: "tour-1",
            name: "Spring Playoffs",
            date: "2026-04-15",
            format: "single-elimination",
            participantType: "team",
            status: "pending",
            rounds: 2,
            bracket: [],
          },
        ];
      if (ref === "teams.getTeams") return [];
      return undefined;
    });

    renderPage();
    expect(screen.getByText("Spring Playoffs")).toBeInTheDocument();
    expect(screen.getByText(/view bracket/i)).toBeInTheDocument();
  });

  it("shows bracket visualization when View Bracket clicked", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "tournaments.getTournaments")
        return [
          {
            _id: "tour-1",
            name: "Spring Playoffs",
            date: "2026-04-15",
            format: "single-elimination",
            participantType: "team",
            status: "pending",
            rounds: 2,
            bracket: [
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
            ],
          },
        ];
      if (ref === "teams.getTeams") return [];
      return undefined;
    });

    renderPage();
    fireEvent.click(screen.getByText(/view bracket/i));

    expect(screen.getByTestId("bracket-view")).toBeInTheDocument();
    expect(screen.getByText(/1\. Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Beta/)).toBeInTheDocument();
    expect(screen.getAllByText(/final/i).length).toBeGreaterThan(0);
  });
});
