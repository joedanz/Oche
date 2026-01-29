// ABOUTME: Tests for multi-file merge page component.
// ABOUTME: Verifies file upload, conflict display, resolution, and merged import.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MultiFileMergePage } from "./MultiFileMergePage";

vi.mock("./csvParser", () => ({
  parseCsvScores: vi.fn(),
}));

const { parseCsvScores } = await import("./csvParser");
const mockParseCsv = vi.mocked(parseCsvScores);

function mockFileReader() {
  return vi
    .spyOn(FileReader.prototype, "readAsText")
    .mockImplementation(function (this: FileReader) {
      setTimeout(() => {
        Object.defineProperty(this, "result", {
          value: "csv-content",
          writable: true,
          configurable: true,
        });
        this.onload?.({ target: this } as ProgressEvent<FileReader>);
      }, 0);
    });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MultiFileMergePage leagueId="league1" matchId="match1" />
    </MemoryRouter>,
  );
}

async function addFile(fileName: string) {
  const input = screen.getByLabelText(/add file/i) as HTMLInputElement;
  const file = new File(["csv"], fileName, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => {
    expect(screen.getByText(fileName)).toBeInTheDocument();
  });
}

describe("MultiFileMergePage", () => {
  let readerSpy: ReturnType<typeof mockFileReader>;

  beforeEach(() => {
    vi.resetAllMocks();
    readerSpy = mockFileReader();
  });

  afterEach(() => {
    cleanup();
    readerSpy.mockRestore();
  });

  it("renders upload area for multiple files", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /merge/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/add file/i)).toBeInTheDocument();
  });

  it("allows adding multiple files", async () => {
    mockParseCsv.mockReturnValue({
      rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    });

    renderPage();
    await addFile("file1.csv");
    expect(screen.getByText("file1.csv")).toBeInTheDocument();
  });

  it("shows merged preview when files have no conflicts", async () => {
    mockParseCsv
      .mockReturnValueOnce({
        rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
        errors: [],
      })
      .mockReturnValueOnce({
        rows: [{ playerName: "Bob", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
        errors: [],
      });

    renderPage();
    await addFile("file1.csv");
    await addFile("file2.csv");

    fireEvent.click(screen.getByRole("button", { name: /merge/i }));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("shows conflicts when same player has different data", async () => {
    mockParseCsv
      .mockReturnValueOnce({
        rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
        errors: [],
      })
      .mockReturnValueOnce({
        rows: [{ playerName: "Alice", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
        errors: [],
      });

    renderPage();
    await addFile("file1.csv");
    await addFile("file2.csv");

    fireEvent.click(screen.getByRole("button", { name: /merge/i }));

    await waitFor(() => {
      expect(screen.getByText(/conflict/i)).toBeInTheDocument();
    });
  });

  it("allows removing an uploaded file", async () => {
    mockParseCsv.mockReturnValue({
      rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      errors: [],
    });

    renderPage();
    await addFile("file1.csv");

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByText("file1.csv")).not.toBeInTheDocument();
  });

  it("disables merge button when fewer than 2 files uploaded", () => {
    renderPage();
    const mergeBtn = screen.getByRole("button", { name: /merge/i });
    expect(mergeBtn).toBeDisabled();
  });

  it("allows resolving a conflict by choosing a file entry", async () => {
    mockParseCsv
      .mockReturnValueOnce({
        rows: [{ playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
        errors: [],
      })
      .mockReturnValueOnce({
        rows: [{ playerName: "Alice", innings: [9, 8, 7, 6, 5, 4, 3, 2, 1] }],
        errors: [],
      });

    renderPage();
    await addFile("file1.csv");
    await addFile("file2.csv");

    fireEvent.click(screen.getByRole("button", { name: /merge/i }));

    await waitFor(() => {
      expect(screen.getByText(/conflict/i)).toBeInTheDocument();
    });

    // Select File 1's version
    const useFile1Buttons = screen.getAllByRole("button", {
      name: /use file 1/i,
    });
    fireEvent.click(useFile1Buttons[0]);

    // Conflict should be resolved, merged preview visible
    await waitFor(() => {
      expect(screen.queryByText(/conflict/i)).not.toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });
});
