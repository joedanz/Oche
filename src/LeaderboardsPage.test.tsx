// ABOUTME: Tests for the LeaderboardsPage component.
// ABOUTME: Validates rendering of leaderboard categories, top-10 entries, and season selector.

import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LeaderboardsPage } from "./LeaderboardsPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    leaderboards: { getLeaderboards: "leaderboards:getLeaderboards" },
  },
}));

import { useQuery } from "convex/react";

function renderPage(props?: { leagueId?: string }) {
  return render(
    <MemoryRouter>
      <LeaderboardsPage leagueId={(props?.leagueId ?? "league1") as any} />
    </MemoryRouter>,
  );
}

const fullData = {
  categories: [
    {
      name: "Highest Average",
      entries: [
        { rank: 1, playerName: "Alice", teamName: "Alpha", value: 50.0 },
        { rank: 2, playerName: "Bob", teamName: "Beta", value: 45.0 },
      ],
    },
    {
      name: "Most Runs",
      entries: [
        { rank: 1, playerName: "Alice", teamName: "Alpha", value: 500 },
      ],
    },
    {
      name: "Best Plus/Minus",
      entries: [
        { rank: 1, playerName: "Alice", teamName: "Alpha", value: 150 },
      ],
    },
    {
      name: "Most High Innings",
      entries: [
        { rank: 1, playerName: "Bob", teamName: "Beta", value: 7 },
      ],
    },
    {
      name: "Most Wins",
      entries: [
        { rank: 1, playerName: "Alice", teamName: "Alpha", value: 8 },
      ],
    },
  ],
  seasons: [
    { id: "season1", name: "Spring 2026", isActive: true },
    { id: "season2", name: "Fall 2025", isActive: false },
  ],
};

describe("LeaderboardsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(cleanup);

  it("shows loading state when data is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders all five leaderboard categories", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Highest Average")).toBeInTheDocument();
    expect(screen.getByText("Most Runs")).toBeInTheDocument();
    expect(screen.getByText("Best Plus/Minus")).toBeInTheDocument();
    expect(screen.getByText("Most High Innings")).toBeInTheDocument();
    expect(screen.getByText("Most Wins")).toBeInTheDocument();
  });

  it("renders player names and values in entries", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getAllByText("Alice")).toHaveLength(4); // appears in 4 categories
    expect(screen.getAllByText("Bob")).toHaveLength(2); // appears in 2 categories
  });

  it("renders team names in entries", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(1);
  });

  it("shows season selector", () => {
    (useQuery as any).mockReturnValue(fullData);
    renderPage();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });

  it("shows empty state for categories with no entries", () => {
    const emptyData = {
      ...fullData,
      categories: fullData.categories.map((c) => ({ ...c, entries: [] })),
    };
    (useQuery as any).mockReturnValue(emptyData);
    renderPage();
    expect(screen.getAllByText(/no data/i).length).toBeGreaterThanOrEqual(1);
  });
});
