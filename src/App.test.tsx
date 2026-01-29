// ABOUTME: Tests for the root App component
// ABOUTME: Verifies basic rendering and Convex provider setup
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

vi.mock("convex/react", () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ConvexReactClient: vi.fn(),
}));

import App from "./App";

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders the landing page", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders with a main element", () => {
    render(<App />);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });
});
