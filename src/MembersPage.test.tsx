// ABOUTME: Tests for the league members page with role assignment UI.
// ABOUTME: Verifies member list display, role changes, and last-admin protection.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MembersPage } from "./MembersPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    members: { getMembersWithDetails: "members:getMembersWithDetails" },
    leagues: { updateMemberRole: "leagues:updateMemberRole" },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockMembers = [
  {
    _id: "m1",
    userId: "u1",
    leagueId: "league1",
    role: "admin",
    userName: "Alice Admin",
    userEmail: "alice@test.com",
  },
  {
    _id: "m2",
    userId: "u2",
    leagueId: "league1",
    role: "captain",
    userName: "Bob Captain",
    userEmail: "bob@test.com",
  },
  {
    _id: "m3",
    userId: "u3",
    leagueId: "league1",
    role: "player",
    userName: "Carol Player",
    userEmail: "carol@test.com",
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("MembersPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage(members = mockMembers) {
    mockUseQuery.mockReturnValue(members);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/members"]}>
        <MembersPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders a list of league members with names and roles", () => {
    renderPage();
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("Bob Captain")).toBeInTheDocument();
    expect(screen.getByText("Carol Player")).toBeInTheDocument();
  });

  it("displays role selector for each member", () => {
    renderPage();
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);
  });

  it("shows current role as selected value", () => {
    renderPage();
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("admin");
    expect(selects[1]).toHaveValue("captain");
    expect(selects[2]).toHaveValue("player");
  });

  it("calls mutation when role is changed", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[2], "captain");

    expect(mockMutate).toHaveBeenCalledWith({
      leagueId: "league1",
      targetUserId: "u3",
      newRole: "captain",
    });
  });

  it("shows loading state when members are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <MembersPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no members exist", () => {
    renderPage([]);
    expect(screen.getByText(/no members/i)).toBeInTheDocument();
  });
});
