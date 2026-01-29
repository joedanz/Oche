// ABOUTME: Tests for the handicap configuration settings page.
// ABOUTME: Verifies form rendering, field changes, save behavior, and validation.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HandicapConfigPage } from "./HandicapConfigPage";

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
    leagues: { getLeague: "leagues:getLeague" },
    handicapConfig: { updateHandicapConfig: "handicapConfig:updateHandicapConfig" },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockLeague = {
  _id: "league1",
  name: "Test League",
  handicapEnabled: false,
  handicapPercent: 100,
  handicapRecalcFrequency: "weekly",
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("HandicapConfigPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage(league = mockLeague) {
    mockUseQuery.mockReturnValue(league);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/handicap"]}>
        <HandicapConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders handicap config form with current values", () => {
    renderPage();
    expect(screen.getByLabelText(/enable handicapping/i)).not.toBeChecked();
    expect(screen.getByLabelText(/handicap percentage/i)).toHaveValue(100);
    expect(screen.getByLabelText(/recalculation frequency/i)).toHaveValue("weekly");
  });

  it("shows loading state when league data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <HandicapConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("toggles handicap enabled checkbox", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText(/enable handicapping/i));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        handicapEnabled: true,
      }),
    );
  });

  it("updates handicap percentage and saves", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const percentInput = screen.getByLabelText(/handicap percentage/i);
    await user.clear(percentInput);
    await user.type(percentInput, "75");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        handicapPercent: 75,
      }),
    );
  });

  it("changes recalculation frequency", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(
      screen.getByLabelText(/recalculation frequency/i),
      "per-match",
    );
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        handicapRecalcFrequency: "per-match",
      }),
    );
  });

  it("shows saved confirmation after successful save", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
  });
});
