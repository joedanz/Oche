// ABOUTME: Tests for Google Sheets import page component.
// ABOUTME: Verifies URL input, sheet fetching, preview, and import flow.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GoogleSheetsImportPage } from "./GoogleSheetsImportPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {},
}));

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/leagues/league1/matches/match1/import-gsheets"]}
    >
      <GoogleSheetsImportPage leagueId="league1" matchId="match1" />
    </MemoryRouter>,
  );
}

describe("GoogleSheetsImportPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders heading and URL input", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /google sheets/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/google sheet url/i),
    ).toBeInTheDocument();
  });

  it("shows fetch button", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /fetch/i }),
    ).toBeInTheDocument();
  });

  it("shows error for invalid URL", async () => {
    renderPage();
    const input = screen.getByLabelText(/google sheet url/i);
    fireEvent.change(input, {
      target: { value: "https://example.com/not-a-sheet" },
    });
    fireEvent.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid google sheets url/i)).toBeInTheDocument();
    });
  });

  it("fetches and shows preview for valid URL", async () => {
    const csvData =
      "Player,1,2,3,4,5,6,7,8,9\nJane Smith,5,3,7,2,9,4,6,1,8";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(csvData),
    });

    renderPage();
    const input = screen.getByLabelText(/google sheet url/i);
    fireEvent.change(input, {
      target: {
        value:
          "https://docs.google.com/spreadsheets/d/abc123/edit",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    renderPage();
    const input = screen.getByLabelText(/google sheet url/i);
    fireEvent.change(input, {
      target: {
        value:
          "https://docs.google.com/spreadsheets/d/abc123/edit",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not fetch/i)).toBeInTheDocument();
    });
  });

  it("shows import button after successful preview", async () => {
    const csvData =
      "Player,1,2,3,4,5,6,7,8,9\nJane Smith,5,3,7,2,9,4,6,1,8";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(csvData),
    });

    renderPage();
    const input = screen.getByLabelText(/google sheet url/i);
    fireEvent.change(input, {
      target: {
        value:
          "https://docs.google.com/spreadsheets/d/abc123/edit",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /fetch/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /import/i }),
      ).toBeInTheDocument();
    });
  });
});
