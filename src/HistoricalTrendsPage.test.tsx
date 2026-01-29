// ABOUTME: Tests for the HistoricalTrendsPage component.
// ABOUTME: Validates rendering, mode switching, player/team selection, and chart display.

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { HistoricalTrendsPage } from "./HistoricalTrendsPage";

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock("recharts", () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => <div />,
}));

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("./usePlan", () => ({
  usePlan: () => ({ isLoading: false, canUse: () => true }),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    trends: {
      getTrendsMetadata: "trends.getTrendsMetadata",
      getPlayerTrend: "trends.getPlayerTrend",
      getTeamTrend: "trends.getTeamTrend",
    },
    dashboard: { getUserLeaguesWithDetails: "dashboard.getUserLeaguesWithDetails" },
    onboarding: { getUserLeagues: "onboarding.getUserLeagues" },
  },
}));

const metadata = {
  players: [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
  ],
  teams: [
    { id: "t1", name: "Alpha" },
    { id: "t2", name: "Beta" },
  ],
  seasons: [{ id: "s1", name: "Spring 2026", isActive: true }],
};

const playerTrend = {
  playerName: "Alice",
  points: [
    { matchDate: "2026-01-01", average: 36, cumulativeAverage: 36 },
    { matchDate: "2026-01-08", average: 54, cumulativeAverage: 45 },
  ],
};

const teamTrend = {
  teamName: "Alpha",
  points: [
    { matchDate: "2026-01-01", matchPoints: 2, cumulativePoints: 2 },
    { matchDate: "2026-01-08", matchPoints: 1, cumulativePoints: 3 },
  ],
};

describe("HistoricalTrendsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseQuery.mockImplementation((ref: string, args: any) => {
      if (ref === "trends.getTrendsMetadata") return metadata;
      if (ref === "trends.getPlayerTrend" && args !== "skip") return playerTrend;
      if (ref === "trends.getTeamTrend" && args !== "skip") return teamTrend;
      return undefined;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page heading and mode buttons", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    expect(screen.getByRole("heading", { name: /historical trends/i })).toBeInTheDocument();
    expect(screen.getByText("Player Averages")).toBeInTheDocument();
    expect(screen.getByText("Team Points")).toBeInTheDocument();
  });

  it("shows loading state when metadata not yet loaded", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays player selection buttons in player mode", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(/select up to 3 players/i)).toBeInTheDocument();
  });

  it("shows chart after selecting a player", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    fireEvent.click(screen.getByText("Alice"));

    expect(screen.getByTestId("player-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("switches to team mode and shows team buttons", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    fireEvent.click(screen.getByText("Team Points"));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/select up to 3 teams/i)).toBeInTheDocument();
  });

  it("shows team chart after selecting a team", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    fireEvent.click(screen.getByText("Team Points"));
    fireEvent.click(screen.getByText("Alpha"));

    expect(screen.getByTestId("team-chart")).toBeInTheDocument();
  });

  it("has season selector", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    const seasonSelect = screen.getByLabelText("Season");
    expect(seasonSelect).toBeInTheDocument();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
  });

  it("shows placeholder when no player selected", () => {
    render(<HistoricalTrendsPage leagueId={"league1" as any} />);

    expect(screen.getByText(/select players to view trends/i)).toBeInTheDocument();
  });
});
