// ABOUTME: Tests for the league sidebar navigation component.
// ABOUTME: Verifies nav links render and highlight the active route.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LeagueNav } from "./LeagueNav";

afterEach(cleanup);

function renderNav(path = "/leagues/l1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeagueNav leagueId="l1" />
    </MemoryRouter>,
  );
}

describe("LeagueNav", () => {
  it("renders a nav element with league section links", () => {
    renderNav();
    const nav = screen.getByRole("navigation", { name: /league/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /standings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /members/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /teams/i })).toBeInTheDocument();
  });

  it("links point to correct league-scoped paths", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /schedule/i })).toHaveAttribute(
      "href",
      "/leagues/l1/schedule",
    );
    expect(screen.getByRole("link", { name: /standings/i })).toHaveAttribute(
      "href",
      "/leagues/l1/standings",
    );
  });

  it("highlights the active link", () => {
    renderNav("/leagues/l1/standings");
    const standingsLink = screen.getByRole("link", { name: /standings/i });
    expect(standingsLink.className).toMatch(/amber|active/);
  });
});
