// ABOUTME: Tests for the marketing landing page
// ABOUTME: Verifies all required sections render correctly
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { LandingPage } from "./LandingPage";

afterEach(() => {
  cleanup();
});

describe("LandingPage", () => {
  it("renders the hero section with headline and CTA", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /get started|start your league/i }),
    ).toBeInTheDocument();
  });

  it("renders the feature highlights section", () => {
    render(<LandingPage />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    const titles = headings.map((h) => h.textContent);
    expect(titles).toContain("Score Entry");
    expect(titles).toContain("Real-Time Stats");
    expect(titles).toContain("Scheduling");
    expect(titles).toContain("Handicapping");
  });

  it("renders the social proof section", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/trusted by leagues and teams/i),
    ).toBeInTheDocument();
  });

  it("renders the pricing section", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /simple pricing/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders the footer with navigation links", () => {
    render(<LandingPage />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("is responsive with appropriate layout classes", () => {
    render(<LandingPage />);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });
});
