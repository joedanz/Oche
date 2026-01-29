// ABOUTME: Tests for the public league page component.
// ABOUTME: Validates rendering of standings, schedule, and results for public leagues.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PublicLeaguePage } from "./PublicLeaguePage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    publicLeague: {
      getPublicLeagueData: "publicLeague:getPublicLeagueData",
    },
  },
}));

afterEach(cleanup);

describe("PublicLeaguePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state while data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows not found when league is not public", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/not found|not public|unavailable/i)).toBeInTheDocument();
  });

  it("renders league name and standings", () => {
    mockUseQuery.mockReturnValue({
      leagueName: "Sunday League",
      standings: [
        { rank: 1, teamName: "Eagles", matchPoints: 10, gameWins: 8, totalRunsScored: 200, plusMinus: 50 },
        { rank: 2, teamName: "Hawks", matchPoints: 7, gameWins: 5, totalRunsScored: 150, plusMinus: 20 },
      ],
      schedule: [],
      recentResults: [],
    });
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Sunday League")).toBeInTheDocument();
    expect(screen.getByText("Eagles")).toBeInTheDocument();
    expect(screen.getByText("Hawks")).toBeInTheDocument();
  });

  it("renders upcoming schedule", () => {
    mockUseQuery.mockReturnValue({
      leagueName: "Sunday League",
      standings: [],
      schedule: [
        { matchId: "m1", homeTeam: "Eagles", visitorTeam: "Hawks", date: "2026-02-15", status: "scheduled" },
      ],
      recentResults: [],
    });
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/eagles/i)).toBeInTheDocument();
    expect(screen.getByText(/hawks/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-02-15/)).toBeInTheDocument();
  });

  it("renders recent results", () => {
    mockUseQuery.mockReturnValue({
      leagueName: "Sunday League",
      standings: [],
      schedule: [],
      recentResults: [
        { matchId: "m1", homeTeam: "Eagles", visitorTeam: "Hawks", date: "2026-01-20", homePoints: 4, visitorPoints: 2 },
      ],
    });
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("shows empty state when no data", () => {
    mockUseQuery.mockReturnValue({
      leagueName: "Empty League",
      standings: [],
      schedule: [],
      recentResults: [],
    });
    render(
      <MemoryRouter>
        <PublicLeaguePage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Empty League")).toBeInTheDocument();
    expect(screen.getByText(/no standings/i)).toBeInTheDocument();
  });
});
