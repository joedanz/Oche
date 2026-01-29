// ABOUTME: Tests for the team roster management page.
// ABOUTME: Verifies player listing, add/remove, status toggle, and empty/loading states.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RosterPage } from "./RosterPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    roster: {
      getRoster: "roster:getRoster",
      addPlayer: "roster:addPlayer",
      removePlayer: "roster:removePlayer",
      setPlayerStatus: "roster:setPlayerStatus",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockPlayers = [
  { _id: "p1", userId: "u1", teamId: "t1", status: "active", userName: "Alice", userEmail: "alice@test.com" },
  { _id: "p2", userId: "u2", teamId: "t1", status: "inactive", userName: "Bob", userEmail: "bob@test.com" },
  { _id: "p3", userId: "u3", teamId: "t1", status: "active", userName: "Charlie", userEmail: "charlie@test.com" },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("RosterPage", () => {
  const mockAddPlayer = vi.fn();
  const mockRemovePlayer = vi.fn();
  const mockSetStatus = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "roster:addPlayer") return mockAddPlayer;
      if (ref === "roster:removePlayer") return mockRemovePlayer;
      if (ref === "roster:setPlayerStatus") return mockSetStatus;
      return vi.fn();
    });
  });

  function renderPage(players = mockPlayers) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "roster:getRoster") return players;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/teams/t1/roster"]}>
        <RosterPage leagueId={"league1" as any} teamId={"t1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders player list with names and status badges", () => {
    renderPage();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getAllByText(/active/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/inactive/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <RosterPage leagueId={"league1" as any} teamId={"t1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no players", () => {
    renderPage([]);
    expect(screen.getByText(/no players/i)).toBeInTheDocument();
  });

  it("renders add player form with name and email fields", () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add player/i })).toBeInTheDocument();
  });

  it("calls add mutation with form values", async () => {
    mockAddPlayer.mockResolvedValue("new-player");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/name/i), "Diana");
    await user.type(screen.getByLabelText(/email/i), "diana@test.com");
    await user.click(screen.getByRole("button", { name: /add player/i }));

    expect(mockAddPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        teamId: "t1",
        playerName: "Diana",
        playerEmail: "diana@test.com",
      }),
    );
  });

  it("calls remove mutation when remove button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(mockRemovePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        playerId: "p1",
      }),
    );
  });

  it("calls set status mutation to toggle inactive player to active", async () => {
    const user = userEvent.setup();
    renderPage();

    // Bob is inactive — find "Activate" button (exact match to exclude "Deactivate")
    const activateButtons = screen.getAllByRole("button", { name: /^activate$/i });
    await user.click(activateButtons[0]);

    expect(mockSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        playerId: "p2",
        status: "active",
      }),
    );
  });

  it("calls set status mutation to toggle active player to inactive", async () => {
    const user = userEvent.setup();
    renderPage();

    // Alice and Charlie are active — find "Deactivate" buttons
    const deactivateButtons = screen.getAllByRole("button", { name: /deactivate/i });
    await user.click(deactivateButtons[0]);

    expect(mockSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        playerId: "p1",
        status: "inactive",
      }),
    );
  });
});
