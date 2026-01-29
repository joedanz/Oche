// ABOUTME: Tests for CSV file upload page component.
// ABOUTME: Verifies file upload, parsing preview, and import confirmation flow.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CsvUploadPage } from "./CsvUploadPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    csvImport: {
      generateUploadUrl: "csvImport:generateUploadUrl",
      importScores: "csvImport:importScores",
    },
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/leagues/league1/matches/match1/import-csv"]}>
      <CsvUploadPage leagueId="league1" matchId="match1" />
    </MemoryRouter>,
  );
}

describe("CsvUploadPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the upload form with file input", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /csv/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument();
  });

  it("only accepts .csv files", () => {
    renderPage();
    const input = screen.getByLabelText(/csv file/i) as HTMLInputElement;
    expect(input.accept).toBe(".csv");
  });

  it("shows parsed preview after selecting a valid CSV file", async () => {
    renderPage();
    const input = screen.getByLabelText(/csv file/i);

    const csvContent = `Player,1,2,3,4,5,6,7,8,9
John Doe,5,3,7,2,9,4,6,1,8`;
    const file = new File([csvContent], "scores.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("shows error message for invalid CSV data", async () => {
    renderPage();
    const input = screen.getByLabelText(/csv file/i);

    const csvContent = `Player,1,2,3,4,5,6,7,8,9
Bad Player,5,3,12,2,9,4,6,1,8`;
    const file = new File([csvContent], "scores.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("shows import button after successful preview", async () => {
    renderPage();
    const input = screen.getByLabelText(/csv file/i);

    const csvContent = `Player,1,2,3,4,5,6,7,8,9
John Doe,5,3,7,2,9,4,6,1,8`;
    const file = new File([csvContent], "scores.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
    });
  });
});
