// ABOUTME: Tests for the seasons management page.
// ABOUTME: Verifies season listing, creation form, activation, and archive display.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SeasonsPage } from "./SeasonsPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    seasons: {
      getSeasons: "seasons:getSeasons",
      createSeason: "seasons:createSeason",
      activateSeason: "seasons:activateSeason",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockSeasons = [
  {
    _id: "s1",
    leagueId: "league1",
    name: "Spring 2026",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    isActive: true,
  },
  {
    _id: "s2",
    leagueId: "league1",
    name: "Fall 2025",
    startDate: "2025-09-01",
    endDate: "2025-12-15",
    isActive: false,
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("SeasonsPage", () => {
  const mockCreateMutate = vi.fn();
  const mockActivateMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "seasons:createSeason") return mockCreateMutate;
      if (ref === "seasons:activateSeason") return mockActivateMutate;
      return vi.fn();
    });
  });

  function renderPage(seasons = mockSeasons) {
    mockUseQuery.mockReturnValue(seasons);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/seasons"]}>
        <SeasonsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders season list with names and dates", () => {
    renderPage();
    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025")).toBeInTheDocument();
  });

  it("shows active badge on the active season", () => {
    renderPage();
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
  });

  it("renders create season form", () => {
    renderPage();
    expect(screen.getByLabelText(/season name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create season/i }),
    ).toBeInTheDocument();
  });

  it("calls create mutation with form values", async () => {
    mockCreateMutate.mockResolvedValue("season-new");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/season name/i), "Summer 2026");
    await user.type(screen.getByLabelText(/start date/i), "2026-07-01");
    await user.type(screen.getByLabelText(/end date/i), "2026-09-30");
    await user.click(
      screen.getByRole("button", { name: /create season/i }),
    );

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        name: "Summer 2026",
        startDate: "2026-07-01",
        endDate: "2026-09-30",
      }),
    );
  });

  it("shows loading state when seasons data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <SeasonsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no seasons exist", () => {
    renderPage([]);
    expect(screen.getByText(/no seasons/i)).toBeInTheDocument();
  });

  it("renders activate button for inactive seasons", () => {
    renderPage();
    const activateButtons = screen.getAllByRole("button", {
      name: /set active/i,
    });
    // Only the inactive season should have an activate button
    expect(activateButtons).toHaveLength(1);
  });

  it("calls activate mutation when clicking set active", async () => {
    mockActivateMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /set active/i }),
    );

    expect(mockActivateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        seasonId: "s2",
      }),
    );
  });
});
