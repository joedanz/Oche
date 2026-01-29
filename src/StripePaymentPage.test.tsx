// ABOUTME: Tests for the Stripe online payment page.
// ABOUTME: Verifies pay button, checkout redirect, and confirmation display.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { StripePaymentPage } from "./StripePaymentPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseAction = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useAction: (...args: any[]) => mockUseAction(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    payments: {
      getPlayerBalances: "payments:getPlayerBalances",
    },
    stripe: {
      createCheckoutSession: "stripe:createCheckoutSession",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockBalances = [
  {
    playerId: "player-1",
    playerName: "Alice",
    teamName: "Team A",
    totalPaid: 0,
    totalOwed: 50,
    balance: -50,
    status: "unpaid",
  },
  {
    playerId: "player-2",
    playerName: "Bob",
    teamName: "Team A",
    totalPaid: 50,
    totalOwed: 50,
    balance: 0,
    status: "paid",
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("StripePaymentPage", () => {
  const mockAction = vi.fn();

  beforeEach(() => {
    mockUseAction.mockReturnValue(mockAction);
    mockUseMutation.mockReturnValue(vi.fn());
  });

  function renderPage(balances = mockBalances) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "payments:getPlayerBalances") return balances;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/pay"]}>
        <StripePaymentPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders the pay online page heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /pay online/i }),
    ).toBeInTheDocument();
  });

  it("shows players with outstanding balances", () => {
    renderPage();
    // Alice is unpaid, should appear
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
  });

  it("shows pay button for unpaid players", () => {
    renderPage();
    const payButtons = screen.getAllByRole("button", { name: /pay/i });
    expect(payButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show pay button for fully paid players", () => {
    renderPage([
      {
        playerId: "player-2",
        playerName: "Bob",
        teamName: "Team A",
        totalPaid: 50,
        totalOwed: 50,
        balance: 0,
        status: "paid",
      },
    ]);
    // Bob is paid — no pay button
    const payButtons = screen.queryAllByRole("button", { name: /pay \$/i });
    expect(payButtons).toHaveLength(0);
  });

  it("calls createCheckoutSession when pay button is clicked", async () => {
    mockAction.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
    const user = userEvent.setup();
    renderPage();

    const payButtons = screen.getAllByRole("button", { name: /pay \$/i });
    await user.click(payButtons[0]);

    expect(mockAction).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        playerId: "player-1",
      }),
    );
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <StripePaymentPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows confirmation message on success return", () => {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "payments:getPlayerBalances") return mockBalances;
      return undefined;
    });
    render(
      <MemoryRouter initialEntries={["/leagues/league1/pay?success=true"]}>
        <StripePaymentPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
  });
});
