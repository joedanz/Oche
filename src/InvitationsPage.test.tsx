// ABOUTME: Tests for the league invitations management page.
// ABOUTME: Verifies invite creation, listing, revocation, and pending invite display.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { InvitationsPage } from "./InvitationsPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    invites: {
      getLeagueInvites: "invites:getLeagueInvites",
      createInvite: "invites:createInvite",
      revokeInvite: "invites:revokeInvite",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockInvites = [
  {
    _id: "i1",
    code: "abc123",
    role: "captain",
    used: false,
    expiresAt: Date.now() + 86400000,
    createdBy: "u1",
  },
  {
    _id: "i2",
    code: "def456",
    role: "player",
    used: true,
    expiresAt: Date.now() + 86400000,
    createdBy: "u1",
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("InvitationsPage", () => {
  const mockCreateInvite = vi.fn();
  const mockRevokeInvite = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((fnName: string) => {
      if (fnName === "invites:createInvite") return mockCreateInvite;
      if (fnName === "invites:revokeInvite") return mockRevokeInvite;
      return vi.fn();
    });
  });

  function renderPage(invites = mockInvites) {
    mockUseQuery.mockReturnValue(invites);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/invitations"]}>
        <InvitationsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders a heading and list of invites", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /invitations/i })).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByText("def456")).toBeInTheDocument();
  });

  it("shows invite role for each invite", () => {
    renderPage();
    const roleTexts = screen.getAllByText(/captain|player/i);
    // Should find roles in invite cards (plus the select options)
    expect(roleTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("shows a revoke button for active (unused) invites", () => {
    renderPage();
    const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
    expect(revokeButtons).toHaveLength(1);
  });

  it("calls revoke mutation when revoke button is clicked", async () => {
    mockRevokeInvite.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const revokeButton = screen.getByRole("button", { name: /revoke/i });
    await user.click(revokeButton);

    expect(mockRevokeInvite).toHaveBeenCalledWith({
      inviteId: "i1",
      leagueId: "league1",
    });
  });

  it("has a form to create new invites with role selection", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("calls create mutation when generating an invite", async () => {
    mockCreateInvite.mockResolvedValue("invite-new");
    const user = userEvent.setup();
    renderPage();

    const roleSelect = screen.getByRole("combobox");
    await user.selectOptions(roleSelect, "player");

    const generateButton = screen.getByRole("button", { name: /generate/i });
    await user.click(generateButton);

    expect(mockCreateInvite).toHaveBeenCalledWith({
      leagueId: "league1",
      role: "player",
    });
  });

  it("shows loading state when invites are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <InvitationsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no invites exist", () => {
    renderPage([]);
    expect(screen.getByText(/no invit/i)).toBeInTheDocument();
  });
});
