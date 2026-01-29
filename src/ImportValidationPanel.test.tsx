// ABOUTME: Tests for the ImportValidationPanel component.
// ABOUTME: Validates error display, skip toggle, and import summary UI.

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ImportValidationPanel } from "./ImportValidationPanel";
import type { ValidationResult } from "./importValidator";

describe("ImportValidationPanel", () => {
  afterEach(cleanup);

  const validResult: ValidationResult = {
    validRows: [
      { playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { playerName: "Bob", innings: [2, 3, 4, 5, 6, 7, 8, 9, 0] },
    ],
    errors: [],
    skippedCount: 0,
    importedCount: 2,
  };

  const mixedResult: ValidationResult = {
    validRows: [
      { playerName: "Alice", innings: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
    errors: [
      { row: 2, message: 'Row 2: Player "Unknown" not found on roster' },
      { row: 3, message: "Row 3: Invalid runs value '12' in inning 3 (must be 0-9)" },
    ],
    skippedCount: 2,
    importedCount: 1,
  };

  it("shows import summary counts", () => {
    render(
      <ImportValidationPanel
        result={mixedResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 row.*imported/i)).toBeInTheDocument();
    expect(screen.getByText(/2 row.*skipped/i)).toBeInTheDocument();
  });

  it("displays row-level error messages", () => {
    render(
      <ImportValidationPanel
        result={mixedResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Player "Unknown" not found on roster/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid runs value '12'/)).toBeInTheDocument();
  });

  it("shows no errors section when all rows are valid", () => {
    render(
      <ImportValidationPanel
        result={validResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
    expect(screen.getByText(/2 row.*imported/i)).toBeInTheDocument();
  });

  it("calls onImport with valid rows when import button clicked", () => {
    const onImport = vi.fn();
    render(
      <ImportValidationPanel
        result={mixedResult}
        onImport={onImport}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /import.*1.*row/i }));
    expect(onImport).toHaveBeenCalledWith(mixedResult.validRows);
  });

  it("disables import button when no valid rows", () => {
    const noValidResult: ValidationResult = {
      validRows: [],
      errors: [{ row: 1, message: "Row 1: Missing player name" }],
      skippedCount: 1,
      importedCount: 0,
    };
    render(
      <ImportValidationPanel
        result={noValidResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ImportValidationPanel
        result={mixedResult}
        onImport={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows preview table of valid rows", () => {
    render(
      <ImportValidationPanel
        result={mixedResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // "Unknown" should not be in the preview table (only valid rows shown)
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("shows all valid rows when no errors", () => {
    render(
      <ImportValidationPanel
        result={validResult}
        onImport={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
