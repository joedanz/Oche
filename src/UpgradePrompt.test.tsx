// ABOUTME: Unit tests for the UpgradePrompt upgrade card component.
// ABOUTME: Validates heading, description, feature list, highlight, links, and pricing.

import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { UpgradePrompt } from "./UpgradePrompt";

function renderPrompt(feature: string, description: string) {
  return render(
    <MemoryRouter>
      <UpgradePrompt feature={feature} description={description} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("UpgradePrompt", () => {
  it("renders heading with feature name", () => {
    renderPrompt("Tournaments", "Run brackets.");
    expect(screen.getByText("Unlock Tournaments")).toBeDefined();
  });

  it("renders feature description", () => {
    renderPrompt("Audit Log", "Track every change.");
    expect(screen.getByText("Track every change.")).toBeDefined();
  });

  it("shows League plan badge", () => {
    renderPrompt("Tournaments", "Run brackets.");
    expect(screen.getByText("Included with League plan")).toBeDefined();
  });

  it("shows all 7 League features in the checklist", () => {
    renderPrompt("Tournaments", "Run brackets.");
    expect(screen.getByText("Up to 3 leagues, unlimited teams")).toBeDefined();
    expect(screen.getByText("Historical trends & export")).toBeDefined();
    expect(screen.getByText("Score import (CSV, Excel)")).toBeDefined();
    expect(screen.getByText("Tournaments")).toBeDefined();
    expect(screen.getByText("Public league pages")).toBeDefined();
    expect(screen.getByText("Audit log")).toBeDefined();
    expect(screen.getByText("Full handicapping")).toBeDefined();
  });

  it("highlights the matching feature in the checklist", () => {
    renderPrompt("Tournaments", "Run brackets.");
    const item = screen.getByText("Tournaments").closest("li");
    expect(item?.className).toContain("text-amber-300");
    expect(item?.className).toContain("font-medium");
  });

  it("does not highlight non-matching features", () => {
    renderPrompt("Tournaments", "Run brackets.");
    const item = screen.getByText("Audit log").closest("li");
    expect(item?.className).not.toContain("text-amber-300");
  });

  it("shows pricing text", () => {
    renderPrompt("Tournaments", "Run brackets.");
    expect(screen.getByText("$12/mo · $99/yr")).toBeDefined();
  });

  it("renders Upgrade to League link pointing to /billing", () => {
    renderPrompt("Tournaments", "Run brackets.");
    const link = screen.getByText("Upgrade to League");
    expect(link.closest("a")?.getAttribute("href")).toBe("/billing");
  });

  it("renders Compare all plans link pointing to /billing", () => {
    renderPrompt("Tournaments", "Run brackets.");
    const link = screen.getByText("Compare all plans");
    expect(link.closest("a")?.getAttribute("href")).toBe("/billing");
  });

  it("highlights partial matches (e.g. Score Import matches Score import list item)", () => {
    renderPrompt("Score Import", "Import CSV scores.");
    const item = screen.getByText("Score import (CSV, Excel)").closest("li");
    expect(item?.className).toContain("text-amber-300");
  });
});
