// ABOUTME: Tests for the audit log page component.
// ABOUTME: Validates rendering, filtering, and display of audit log entries.

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuditLogPage } from "./AuditLogPage";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    auditLog: {
      getAuditLog: "auditLog:getAuditLog",
    },
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AuditLogPage leagueId={"league1" as any} />
    </MemoryRouter>,
  );
}

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(cleanup);

  it("renders the audit log heading", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByRole("heading", { name: /audit log/i })).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    mockUseQuery.mockReturnValue([]);
    renderPage();
    expect(screen.getByText(/no audit log entries/i)).toBeInTheDocument();
  });

  it("renders audit log entries", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "a1",
        userId: "u1",
        userName: "Joe",
        action: "score_entry",
        details: "Entered scores for Game 1",
        createdAt: Date.now(),
      },
      {
        _id: "a2",
        userId: "u2",
        userName: "Alice",
        action: "role_change",
        details: "Changed role",
        oldValue: "player",
        newValue: "captain",
        createdAt: Date.now() - 60000,
      },
    ]);
    renderPage();
    expect(screen.getByText("Entered scores for Game 1")).toBeInTheDocument();
    expect(screen.getByText("Changed role")).toBeInTheDocument();
    expect(screen.getByText("Joe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows old/new values when present", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "a1",
        userId: "u1",
        userName: "Joe",
        action: "score_edit",
        details: "Edited inning 3",
        oldValue: "5",
        newValue: "7",
        createdAt: Date.now(),
      },
    ]);
    renderPage();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("has filter dropdown for action type", () => {
    mockUseQuery.mockReturnValue([]);
    renderPage();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("filters entries by action type", () => {
    mockUseQuery.mockReturnValue([]);
    renderPage();
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "score_entry" } });
    // Verify useQuery was called with the filter
    expect(mockUseQuery).toHaveBeenCalledWith(
      "auditLog:getAuditLog",
      expect.objectContaining({ action: "score_entry" }),
    );
  });

  it("displays action type badges", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "a1",
        userId: "u1",
        userName: "Joe",
        action: "score_import",
        details: "Imported CSV",
        createdAt: Date.now(),
      },
    ]);
    renderPage();
    expect(screen.getAllByText(/score import/i).length).toBeGreaterThanOrEqual(1);
  });
});
