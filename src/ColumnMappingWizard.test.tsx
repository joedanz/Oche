// ABOUTME: Tests for the ColumnMappingWizard UI component.
// ABOUTME: Validates step-by-step wizard flow, auto-detection, and template save/load.

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    importTemplates: {
      getTemplates: "importTemplates:getTemplates",
      saveTemplate: "importTemplates:saveTemplate",
    },
  },
}));

import { ColumnMappingWizard } from "./ColumnMappingWizard";

const mockHeaders = ["Player", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const mockData = [
  ["Alice", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  ["Bob", "0", "1", "0", "1", "0", "1", "0", "1", "0"],
];

describe("ColumnMappingWizard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseQuery.mockReturnValue(undefined);
    mockUseMutation.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders column mapping step with headers", () => {
    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /map columns/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/player name/i)).toBeInTheDocument();
  });

  it("auto-detects column mapping from headers", () => {
    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    const playerSelect = screen.getByLabelText(
      /player name/i,
    ) as HTMLSelectElement;
    expect(playerSelect.value).toBe("0");
  });

  it("shows preview after mapping is configured", () => {
    const onComplete = vi.fn();
    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls onMappingComplete with parsed data on confirm", () => {
    const onComplete = vi.fn();
    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ playerName: "Alice" }),
        ]),
      }),
    );
  });

  it("shows validation errors when mapping is incomplete", () => {
    const headers = ["Col A", "Col B", "Col C"];
    const data = [["a", "b", "c"]];
    render(
      <ColumnMappingWizard
        headers={headers}
        rawData={data}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByText(/player name column/i)).toBeInTheDocument();
  });

  it("allows saving mapping as template", () => {
    const saveFn = vi.fn();
    mockUseMutation.mockReturnValue(saveFn);

    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /save.*template/i }),
    );
    const nameInput = screen.getByPlaceholderText(/template name/i);
    fireEvent.change(nameInput, { target: { value: "My Template" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(saveFn).toHaveBeenCalled();
  });

  it("loads a saved template", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "t1",
        name: "Standard Format",
        mapping: {
          playerName: 0,
          innings: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        },
      },
    ]);

    render(
      <ColumnMappingWizard
        headers={mockHeaders}
        rawData={mockData}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /standard format/i }));
    const playerSelect = screen.getByLabelText(
      /player name/i,
    ) as HTMLSelectElement;
    expect(playerSelect.value).toBe("0");
  });

  it("maps plus and minus columns when available", () => {
    const headers = [
      "Player",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "Plus",
      "Minus",
    ];
    render(
      <ColumnMappingWizard
        headers={headers}
        rawData={[
          ["Alice", "1", "2", "3", "4", "5", "6", "7", "8", "9", "45", "30"],
        ]}
        leagueId="league1"
        onMappingComplete={vi.fn()}
      />,
    );
    const plusSelect = screen.getByLabelText(/^plus$/i) as HTMLSelectElement;
    const minusSelect = screen.getByLabelText(/^minus$/i) as HTMLSelectElement;
    expect(plusSelect.value).toBe("10");
    expect(minusSelect.value).toBe("11");
  });
});
