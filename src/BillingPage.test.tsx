// ABOUTME: Tests for the billing management page.
// ABOUTME: Verifies plan display, upgrade buttons, and billing portal access.

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingPage } from "./BillingPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    subscriptions: {
      mySubscription: "mySubscription",
      createSubscriptionCheckout: "createSubscriptionCheckout",
      createBillingPortalSession: "createBillingPortalSession",
    },
  },
}));

import { useQuery } from "convex/react";

describe("BillingPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(cleanup);

  it("shows loading state while subscription is undefined", () => {
    (useQuery as any).mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows Starter plan for free users", () => {
    (useQuery as any).mockReturnValue({ planId: "starter", status: "active" });
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Starter Plan")).toBeInTheDocument();
    expect(screen.getAllByText("Free").length).toBeGreaterThanOrEqual(1);
  });

  it("shows upgrade buttons for starter users", () => {
    (useQuery as any).mockReturnValue({ planId: "starter", status: "active" });
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /upgrade to league/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade to association/i })).toBeInTheDocument();
  });

  it("shows current plan details for League subscribers", () => {
    (useQuery as any).mockReturnValue({
      planId: "league",
      status: "active",
      billingInterval: "monthly",
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 86400 * 30,
    });
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("League Plan")).toBeInTheDocument();
    expect(screen.getAllByText(/\$12/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows manage subscription button for paid users", () => {
    (useQuery as any).mockReturnValue({
      planId: "league",
      status: "active",
      billingInterval: "monthly",
    });
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /manage subscription/i })).toBeInTheDocument();
  });

  it("shows past due warning when subscription is past due", () => {
    (useQuery as any).mockReturnValue({
      planId: "league",
      status: "past_due",
      billingInterval: "monthly",
    });
    render(
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/past due/i)).toBeInTheDocument();
  });
});
