// ABOUTME: Tests for the auto-generate schedule page.
// ABOUTME: Verifies team selection, date input, preview, and confirmation flow.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ScheduleGeneratorPage } from "./ScheduleGeneratorPage";

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
    },
    seasons: {
      getSeasons: "seasons:getSeasons",
    },
    scheduleGenerator: {
      generateSchedule: "scheduleGenerator:generateSchedule",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockTeams = [
  { _id: "t1", leagueId: "league1", name: "Eagles", venue: "The Pub" },
  { _id: "t2", leagueId: "league1", name: "Hawks", venue: "Sports Bar" },
  { _id: "t3", leagueId: "league1", name: "Tigers", venue: "Lounge" },
  { _id: "t4", leagueId: "league1", name: "Bears", venue: "Tavern" },
];

const mockSeasons = [
  { _id: "s1", leagueId: "league1", name: "Spring 2026", startDate: "2026-01-01", endDate: "2026-06-30", isActive: true },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("ScheduleGeneratorPage", () => {
  const mockGenerateMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "scheduleGenerator:generateSchedule") return mockGenerateMutate;
      return vi.fn();
    });
  });

  function renderPage(teams = mockTeams, seasons = mockSeasons) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "teams:getTeams") return teams;
      if (ref === "seasons:getSeasons") return seasons;
      return undefined;
    });
    return render(
      <MemoryRouter>
        <ScheduleGeneratorPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders team checkboxes for selection", () => {
    renderPage();
    expect(screen.getByRole("checkbox", { name: /eagles/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /hawks/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /tigers/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /bears/i })).toBeInTheDocument();
  });

  it("renders start date and weeks between rounds inputs", () => {
    renderPage();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weeks between rounds/i)).toBeInTheDocument();
  });

  it("requires at least 2 teams to generate", async () => {
    const user = userEvent.setup();
    renderPage();

    // Select only one team
    await user.click(screen.getByRole("checkbox", { name: /eagles/i }));

    const dateInput = screen.getByLabelText(/start date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-02-01");

    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(screen.getByText(/at least 2 teams/i)).toBeInTheDocument();
    expect(mockGenerateMutate).not.toHaveBeenCalled();
  });

  it("calls generate mutation with selected teams and date", async () => {
    mockGenerateMutate.mockResolvedValue(["m1", "m2", "m3"]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("checkbox", { name: /eagles/i }));
    await user.click(screen.getByRole("checkbox", { name: /hawks/i }));
    await user.click(screen.getByRole("checkbox", { name: /tigers/i }));

    const dateInput = screen.getByLabelText(/start date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-02-01");

    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(mockGenerateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        teamIds: expect.arrayContaining(["t1", "t2", "t3"]),
        startDate: "2026-02-01",
      }),
    );
  });

  it("shows success message after generation", async () => {
    mockGenerateMutate.mockResolvedValue(["m1", "m2", "m3"]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("checkbox", { name: /eagles/i }));
    await user.click(screen.getByRole("checkbox", { name: /hawks/i }));

    const dateInput = screen.getByLabelText(/start date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-02-01");

    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(await screen.findByText(/schedule generated/i)).toBeInTheDocument();
  });

  it("shows error when no active season exists", async () => {
    const user = userEvent.setup();
    renderPage(mockTeams, [{ _id: "s1", leagueId: "league1", name: "Spring 2026", startDate: "2026-01-01", endDate: "2026-06-30", isActive: false }]);

    await user.click(screen.getByRole("checkbox", { name: /eagles/i }));
    await user.click(screen.getByRole("checkbox", { name: /hawks/i }));

    const dateInput = screen.getByLabelText(/start date/i);
    await user.clear(dateInput);
    await user.type(dateInput, "2026-02-01");

    await user.click(screen.getByRole("button", { name: /generate/i }));

    expect(screen.getByText(/no active season/i)).toBeInTheDocument();
  });

  it("has select all / deselect all buttons", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^select all$/i }));

    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb).toBeChecked();
    }

    await user.click(screen.getByRole("button", { name: /^deselect all$/i }));

    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked();
    }
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <ScheduleGeneratorPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
