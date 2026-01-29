// ABOUTME: Tests for the payment configuration settings page.
// ABOUTME: Verifies form rendering, field changes, save behavior, and loading state.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PaymentConfigPage } from "./PaymentConfigPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    leagues: { getLeague: "leagues:getLeague" },
    paymentConfig: { updatePaymentConfig: "paymentConfig:updatePaymentConfig" },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockLeague = {
  _id: "league1",
  name: "Test League",
  leagueFee: 50,
  weeklyFee: 10,
  feeSchedule: "weekly",
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("PaymentConfigPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage(league = mockLeague) {
    mockUseQuery.mockReturnValue(league);
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/payments"]}>
        <PaymentConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders payment config form with current values", () => {
    renderPage();
    expect(screen.getByLabelText(/league fee/i)).toHaveValue(50);
    expect(screen.getByLabelText(/weekly fee/i)).toHaveValue(10);
    expect(screen.getByLabelText(/fee schedule/i)).toHaveValue("weekly");
  });

  it("shows loading state when league data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <PaymentConfigPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("updates league fee and saves", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const feeInput = screen.getByLabelText(/league fee/i);
    await user.clear(feeInput);
    await user.type(feeInput, "75");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueFee: 75,
      }),
    );
  });

  it("updates weekly fee and saves", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const weeklyInput = screen.getByLabelText(/weekly fee/i);
    await user.clear(weeklyInput);
    await user.type(weeklyInput, "15");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyFee: 15,
      }),
    );
  });

  it("changes fee schedule", async () => {
    mockMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(
      screen.getByLabelText(/fee schedule/i),
      "per-match",
    );
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        feeSchedule: "per-match",
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
