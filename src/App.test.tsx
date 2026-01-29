// ABOUTME: Tests for the root App component
// ABOUTME: Verifies basic rendering and routing setup
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
  })),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn() }),
}));

vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return { ...actual, useQuery: () => [], useMutation: () => vi.fn() };
});

import { useAuth } from "./useAuth";
import App from "./App";

const mockUseAuth = vi.mocked(useAuth);

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders the landing page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders with a main element", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });

  it("redirects /login to / when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/log in/i, { selector: "h1" })).not.toBeInTheDocument();
  });

  it("redirects /signup to / when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/create an account/i, { selector: "h1" })).not.toBeInTheDocument();
  });
});
