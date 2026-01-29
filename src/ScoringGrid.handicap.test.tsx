// ABOUTME: Tests for handicap display in the ScoringGrid component.
// ABOUTME: Verifies spot runs and adjusted totals appear when handicapping is enabled.

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    scoring: { getGameInnings: "scoring:getGameInnings", saveInnings: "scoring:saveInnings" },
    handicapScoring: { getGameHandicap: "handicapScoring:getGameHandicap" },
  },
}));

import { ScoringGrid } from "./ScoringGrid";

describe("ScoringGrid handicap display", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("shows spot runs when handicap data is available", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "scoring:getGameInnings") return [];
      if (ref === "handicapScoring:getGameHandicap") {
        return {
          spotRuns: 3,
          recipientSide: "visitor",
          homeAverage: 5.2,
          visitorAverage: 3.1,
          handicapPercent: 70,
        };
      }
      return undefined;
    });

    render(
      <ScoringGrid
        gameId={"game1" as any}
        leagueId={"league1" as any}
        homePlayerName="Alice"
        visitorPlayerName="Bob"
      />,
    );

    const info = screen.getByTestId("handicap-info");
    expect(info).toBeTruthy();
    expect(info.textContent).toMatch(/spot: \+3/i);
    expect(info.textContent).toMatch(/bob/i);
  });

  it("shows adjusted totals column when handicap is active", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "scoring:getGameInnings") return [];
      if (ref === "handicapScoring:getGameHandicap") {
        return {
          spotRuns: 2,
          recipientSide: "home",
          homeAverage: 3.0,
          visitorAverage: 5.0,
          handicapPercent: 100,
        };
      }
      return undefined;
    });

    render(
      <ScoringGrid
        gameId={"game1" as any}
        leagueId={"league1" as any}
        homePlayerName="Alice"
        visitorPlayerName="Bob"
      />,
    );

    // Should show "Adj" column header
    expect(screen.getByText("Adj")).toBeTruthy();
  });

  it("does not show handicap info when no handicap data", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "scoring:getGameInnings") return [];
      if (ref === "handicapScoring:getGameHandicap") return null;
      return undefined;
    });

    render(
      <ScoringGrid
        gameId={"game1" as any}
        leagueId={"league1" as any}
        homePlayerName="Alice"
        visitorPlayerName="Bob"
      />,
    );

    expect(screen.queryByTestId("handicap-info")).toBeNull();
    expect(screen.queryByText("Adj")).toBeNull();
  });

  it("does not show handicap info when spot runs are 0", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "scoring:getGameInnings") return [];
      if (ref === "handicapScoring:getGameHandicap") {
        return {
          spotRuns: 0,
          recipientSide: null,
          homeAverage: 4.0,
          visitorAverage: 4.0,
          handicapPercent: 70,
        };
      }
      return undefined;
    });

    render(
      <ScoringGrid
        gameId={"game1" as any}
        leagueId={"league1" as any}
        homePlayerName="Alice"
        visitorPlayerName="Bob"
      />,
    );

    expect(screen.queryByTestId("handicap-info")).toBeNull();
  });
});
