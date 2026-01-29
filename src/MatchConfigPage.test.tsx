// ABOUTME: Tests for the match configuration settings page.
// ABOUTME: Verifies form rendering, field changes, and save behavior.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MatchConfigPage } from "./MatchConfigPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    leagues: { getLeague: "leagues:getLeague" },
    matchConfig: { updateMatchConfig: "matchConfig:updateMatchConfig" },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockLeague = {
  _id: "league1",
  name: "Test League",
  matchConfig: {
    gamesPerMatch: 5,
    pointsPerGameWin: 1,
    bonusForTotal: true,
    extraExclude: true,
    blindRules: { enabled: false, defaultRuns: 0 },
  },
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("MatchConfigPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage(league = mockLeague) {
    mockUseQuery.mockReturnValue(league);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/settings"]}>
        <MatchConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders match config form with current values", () => {
    renderPage();
    expect(
      screen.getByLabelText(/games per match/i),
    ).toHaveValue(5);
    expect(
      screen.getByLabelText(/points per game win/i),
    ).toHaveValue(1);
    expect(screen.getByLabelText(/bonus.*total/i)).toBeChecked();
    expect(screen.getByLabelText(/extra.*exclude/i)).toBeChecked();
  });

  it("renders blind rules controls", () => {
    renderPage();
    expect(screen.getByLabelText(/blinds.*enabled/i)).not.toBeChecked();
    expect(
      screen.getByLabelText(/blind default runs/i),
    ).toHaveValue(0);
  });

  it("calls mutation with updated values on save", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const gamesInput = screen.getByLabelText(/games per match/i);
    await user.clear(gamesInput);
    await user.type(gamesInput, "3");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        gamesPerMatch: 3,
      }),
    );
  });

  it("shows loading state when league data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <MatchConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("toggles bonus for total checkbox", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const checkbox = screen.getByLabelText(/bonus.*total/i);
    await user.click(checkbox);

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        bonusForTotal: false,
      }),
    );
  });

  it("toggles blinds enabled and updates default runs", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText(/blinds.*enabled/i));
    const defaultRuns = screen.getByLabelText(/blind default runs/i);
    await user.clear(defaultRuns);
    await user.type(defaultRuns, "5");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        blindEnabled: true,
        blindDefaultRuns: 5,
      }),
    );
  });
});
