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
  it("renders the app heading", () => {
    render(<App />);
    expect(screen.getByText("Oche")).toBeInTheDocument();
  });

  it("renders with Tailwind utility classes", () => {
    render(<App />);
    const main = screen.getByRole("main");
    expect(main).toHaveClass("flex", "min-h-screen");
  });
});
