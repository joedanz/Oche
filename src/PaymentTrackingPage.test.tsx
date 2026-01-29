// ABOUTME: Tests for the payment tracking page.
// ABOUTME: Verifies player balances display, payment recording form, and payment history.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PaymentTrackingPage } from "./PaymentTrackingPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    payments: {
      getPlayerBalances: "payments:getPlayerBalances",
      getPayments: "payments:getPayments",
      recordPayment: "payments:recordPayment",
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
    totalPaid: 30,
    totalOwed: 50,
    balance: -20,
    status: "partial",
  },
  {
    playerId: "player-2",
    playerName: "Bob",
    teamName: "Team A",
    totalPaid: 0,
    totalOwed: 50,
    balance: -50,
    status: "unpaid",
  },
  {
    playerId: "player-3",
    playerName: "Charlie",
    teamName: "Team B",
    totalPaid: 50,
    totalOwed: 50,
    balance: 0,
    status: "paid",
  },
];

const mockPayments = [
  {
    _id: "p1",
    playerId: "player-1",
    playerName: "Alice",
    amount: 30,
    note: "Partial payment",
    recordedByName: "Admin",
    recordedAt: Date.now(),
  },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("PaymentTrackingPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage(balances = mockBalances, payments = mockPayments) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "payments:getPlayerBalances") return balances;
      if (ref === "payments:getPayments") return payments;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/payment-tracking"]}>
        <PaymentTrackingPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders player balances table", () => {
    renderPage();
    // Names appear in both balances and history/dropdown
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Charlie").length).toBeGreaterThanOrEqual(1);
  });

  it("shows payment status badges", () => {
    renderPage();
    // "Paid" may appear in multiple contexts
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Partial").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unpaid").length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <PaymentTrackingPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders record payment form", () => {
    renderPage();
    expect(screen.getByLabelText(/player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /record payment/i })).toBeInTheDocument();
  });

  it("submits a payment", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/player/i), "player-1");
    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "20");
    await user.click(screen.getByRole("button", { name: /record payment/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "player-1",
        amount: 20,
      }),
    );
  });

  it("displays payment history", () => {
    renderPage();
    expect(screen.getByText("Partial payment")).toBeInTheDocument();
    // $30.00 appears in both balances and history tables
    expect(screen.getAllByText("$30.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows balance amounts with correct formatting", () => {
    renderPage();
    // Multiple players owe $50.00
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows outstanding balance for partial payments", () => {
    renderPage();
    // Alice owes $20 more
    expect(screen.getByText("-$20.00")).toBeInTheDocument();
  });
});
