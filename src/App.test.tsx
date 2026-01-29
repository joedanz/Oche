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

import App from "./App";

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
});
