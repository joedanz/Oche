// ABOUTME: Tests for landing page navigation and routing
// ABOUTME: Verifies header nav links, route rendering, and auth redirect
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: vi.fn(() => vi.fn()),
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
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
  })),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

import App from "./App";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("Navigation", () => {
  it("renders header with logo, Log In, and Sign Up links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header.textContent).toContain("OCHE");
    expect(
      screen.getAllByRole("link", { name: /log in/i }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("link", { name: /sign up/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders login page at /login route", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("renders signup page at /signup route", () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /sign up|create.*account/i }),
    ).toBeInTheDocument();
  });

  it("redirects authenticated users with leagues from landing to dashboard", async () => {
    const { useAuth } = await import("./useAuth");
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseQuery.mockReturnValue([{ _id: "m1", leagueId: "l1", role: "admin" }]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
  });

  it("redirects authenticated users without leagues to onboarding", async () => {
    const { useAuth } = await import("./useAuth");
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    mockUseQuery.mockReturnValue([]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /welcome to oche/i }),
    ).toBeInTheDocument();
  });

  it("Sign Up link points to /signup", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i });
    const headerSignUp = signUpLinks.find(
      (link) => link.closest("header") !== null,
    );
    expect(headerSignUp).toHaveAttribute("href", "/signup");
  });

  it("Log In link points to /login", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    const loginLinks = screen.getAllByRole("link", { name: /log in/i });
    const headerLogin = loginLinks.find(
      (link) => link.closest("header") !== null,
    );
    expect(headerLogin).toHaveAttribute("href", "/login");
  });
});
