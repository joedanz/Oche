// ABOUTME: Tests for the post-signup onboarding page.
// ABOUTME: Verifies Create/Join league options, league creation form, and invite code input.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { OnboardingPage } from "./OnboardingPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    onboarding: {
      getUserLeagues: "onboarding:getUserLeagues",
      createLeague: "onboarding:createLeague",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("OnboardingPage", () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockReturnValue(mockMutate);
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>,
    );
  }

  it("shows Create a League and Join a League options", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /create a league/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /join a league/i }),
    ).toBeInTheDocument();
  });

  it("shows league creation form when Create a League is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create a league/i }));

    expect(screen.getByLabelText(/league name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^create league$/i }),
    ).toBeInTheDocument();
  });

  it("shows invite code input when Join a League is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /join a league/i }));

    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
  });

  it("calls createLeague mutation when form is submitted", async () => {
    mockMutate.mockResolvedValue("new-league-id");
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create a league/i }));
    await user.type(screen.getByLabelText(/league name/i), "My Dart League");
    await user.click(
      screen.getByRole("button", { name: /^create league$/i }),
    );

    expect(mockMutate).toHaveBeenCalledWith({
      name: "My Dart League",
    });
  });

  it("shows validation error when league name is empty", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create a league/i }));
    await user.click(
      screen.getByRole("button", { name: /^create league$/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/league name/i);
  });
});
