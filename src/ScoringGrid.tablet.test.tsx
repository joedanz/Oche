// ABOUTME: Tests for tablet-friendly scoring grid behavior.
// ABOUTME: Verifies touch targets, responsive layout, and mobile input attributes.

import { render, screen, cleanup } from "@testing-library/react";
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
    scoring: {
      saveInnings: "scoring:saveInnings",
      getGameInnings: "scoring:getGameInnings",
    },
    handicapScoring: {
      getGameHandicap: "handicapScoring:getGameHandicap",
    },
  },
}));

import { ScoringGrid } from "./ScoringGrid";

function renderGrid() {
  return render(
    <MemoryRouter>
      <ScoringGrid
        gameId={"game-1" as any}
        leagueId={"league-1" as any}
        homePlayerName="Alice"
        visitorPlayerName="Bob"
      />
    </MemoryRouter>,
  );
}

describe("ScoringGrid tablet support", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseQuery.mockReturnValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("uses touch-action: manipulation on the grid container", () => {
    renderGrid();
    const table = screen.getByRole("table");
    const container = table.closest("[data-testid='scoring-grid-container']");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("touch-action-manipulation");
  });

  it("uses inputmode='numeric' on input cells for mobile keyboards", () => {
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    for (const input of inputs) {
      expect(input).toHaveAttribute("inputmode", "numeric");
    }
  });

  it("applies touch-friendly minimum size classes to input cells", () => {
    renderGrid();
    const inputs = screen.getAllByRole("spinbutton");
    // Each input should have min-h-[44px] for touch targets
    for (const input of inputs) {
      expect(input.className).toMatch(/min-h-\[44px\]/);
    }
  });

  it("applies touch-friendly minimum size to save button", () => {
    renderGrid();
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn.className).toMatch(/min-h-\[44px\]/);
  });

  it("has overflow-x-auto for horizontal scrolling on narrow screens", () => {
    renderGrid();
    const table = screen.getByRole("table");
    const container = table.closest("[data-testid='scoring-grid-container']");
    expect(container).toHaveClass("overflow-x-auto");
  });
});
