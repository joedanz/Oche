// ABOUTME: Tests for Excel file upload page component.
// ABOUTME: Verifies file upload, sheet selection, parsing preview, and import flow.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExcelUploadPage } from "./ExcelUploadPage";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {},
}));

// Mock SheetJS to avoid needing real Excel binary parsing in jsdom
vi.mock("xlsx", () => {
  const sheetNames = ["Sheet1"];
  const sheetData = [
    ["Player", 1, 2, 3, 4, 5, 6, 7, 8, 9],
    ["John Doe", 5, 3, 7, 2, 9, 4, 6, 1, 8],
  ];
  return {
    read: vi.fn(() => ({
      SheetNames: sheetNames,
      Sheets: {
        Sheet1: {},
      },
    })),
    utils: {
      sheet_to_json: vi.fn(() => sheetData.slice(1).map((row) => {
        const obj: Record<string, unknown> = {};
        sheetData[0].forEach((header, i) => {
          obj[String(header)] = row[i];
        });
        return obj;
      })),
    },
  };
});

// Mock the parser to control test output
vi.mock("./excelParser", () => ({
  parseExcelScores: vi.fn(() => ({
    rows: [{ playerName: "John Doe", innings: [5, 3, 7, 2, 9, 4, 6, 1, 8] }],
    errors: [],
    sheetNames: ["Sheet1"],
  })),
}));

import { parseExcelScores } from "./excelParser";
const mockParseExcelScores = parseExcelScores as ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/leagues/league1/matches/match1/import-excel"]}>
      <ExcelUploadPage leagueId="league1" matchId="match1" />
    </MemoryRouter>,
  );
}

describe("ExcelUploadPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockParseExcelScores.mockReturnValue({
      rows: [{ playerName: "John Doe", innings: [5, 3, 7, 2, 9, 4, 6, 1, 8] }],
      errors: [],
      sheetNames: ["Sheet1"],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the upload form with file input", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /excel/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/excel file/i)).toBeInTheDocument();
  });

  it("accepts .xlsx and .xls files", () => {
    renderPage();
    const input = screen.getByLabelText(/excel file/i) as HTMLInputElement;
    expect(input.accept).toBe(".xlsx,.xls");
  });

  it("shows parsed preview after selecting a valid Excel file", async () => {
    renderPage();
    const input = screen.getByLabelText(/excel file/i);
    const file = new File([new ArrayBuffer(10)], "scores.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("shows error message for invalid Excel data", async () => {
    mockParseExcelScores.mockReturnValue({
      rows: [],
      errors: ["Row 1: Invalid runs value '12' in inning 3 (must be 0-9)"],
      sheetNames: ["Sheet1"],
    });

    renderPage();
    const input = screen.getByLabelText(/excel file/i);
    const file = new File([new ArrayBuffer(10)], "scores.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("shows sheet selector for multi-sheet workbooks", async () => {
    mockParseExcelScores.mockReturnValue({
      rows: [{ playerName: "John Doe", innings: [5, 3, 7, 2, 9, 4, 6, 1, 8] }],
      errors: [],
      sheetNames: ["Scores", "Summary"],
    });

    renderPage();
    const input = screen.getByLabelText(/excel file/i);
    const file = new File([new ArrayBuffer(10)], "scores.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText(/sheet/i)).toBeInTheDocument();
    });
  });

  it("shows import button after successful preview", async () => {
    renderPage();
    const input = screen.getByLabelText(/excel file/i);
    const file = new File([new ArrayBuffer(10)], "scores.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
    });
  });
});
