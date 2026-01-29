// ABOUTME: Tests for the PlayerStatsExportPage component.
// ABOUTME: Validates CSV and PDF export of player statistics with season context.

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PlayerStatsExportPage } from "./PlayerStatsExportPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("./usePlan", () => ({
  usePlan: () => ({ isLoading: false, canUse: () => true }),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    statsExport: { getExportData: "statsExport:getExportData" },
  },
}));

import { useQuery } from "convex/react";

function renderPage(props?: { leagueId?: string }) {
  return render(
    <MemoryRouter>
      <PlayerStatsExportPage leagueId={(props?.leagueId ?? "league1") as any} />
    </MemoryRouter>,
  );
}

const sampleData = {
  seasons: [
    { id: "s1", name: "Fall 2025", isActive: true },
  ],
  playerStats: [
    { playerName: "Alice", teamName: "Aces", average: 5.5, totalPlus: 55, totalMinus: 30, plusMinus: 25, highInnings: 3, wins: 8, losses: 2, gamesPlayed: 10 },
    { playerName: "Bob", teamName: "Kings", average: 4.2, totalPlus: 42, totalMinus: 38, plusMinus: 4, highInnings: 1, wins: 5, losses: 5, gamesPlayed: 10 },
  ],
};

describe("PlayerStatsExportPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test");
    global.URL.revokeObjectURL = vi.fn();
  });
  afterEach(cleanup);

  it("shows loading state when data is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders player stats table", () => {
    (useQuery as any).mockReturnValue(sampleData);
    renderPage();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders export CSV button", () => {
    (useQuery as any).mockReturnValue(sampleData);
    renderPage();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("renders export PDF button", () => {
    (useQuery as any).mockReturnValue(sampleData);
    renderPage();
    expect(screen.getByRole("button", { name: /export pdf/i })).toBeInTheDocument();
  });

  it("triggers CSV download on export click", () => {
    (useQuery as any).mockReturnValue(sampleData);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it("shows season selector", () => {
    (useQuery as any).mockReturnValue(sampleData);
    renderPage();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });
});
