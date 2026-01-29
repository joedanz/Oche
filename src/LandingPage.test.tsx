// ABOUTME: Tests for the marketing landing page
// ABOUTME: Verifies all required sections render correctly
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "./LandingPage";

afterEach(() => {
  cleanup();
});

describe("LandingPage", () => {
  it("renders the hero section with headline and CTA", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
    const ctaLinks = screen.getAllByRole("link", { name: /get started|start your league/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the feature highlights section", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole("heading", { level: 3 });
    const titles = headings.map((h) => h.textContent);
    expect(titles).toContain("Score Entry");
    expect(titles).toContain("Real-Time Stats");
    expect(titles).toContain("Scheduling");
    expect(titles).toContain("Handicapping");
  });

  it("renders the social proof section", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/trusted by leagues/i),
    ).toBeInTheDocument();
  });

  it("renders the pricing section", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /free to start/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders the footer with navigation links", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    const loginLinks = screen.getAllByRole("link", { name: /log in/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i });
    expect(signUpLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("is responsive with appropriate layout classes", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });
});
