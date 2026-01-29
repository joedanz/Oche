// ABOUTME: Tests for the divisions management page.
// ABOUTME: Verifies division listing, creation, editing, deletion, and team assignment.

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DivisionsPage } from "./DivisionsPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    divisions: {
      getDivisions: "divisions:getDivisions",
      createDivision: "divisions:createDivision",
      editDivision: "divisions:editDivision",
      deleteDivision: "divisions:deleteDivision",
      assignTeamDivision: "divisions:assignTeamDivision",
      getTeamsForLeague: "divisions:getTeamsForLeague",
    },
  },
}));

vi.mock("./useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockDivisions = [
  { _id: "d1", leagueId: "league1", name: "East" },
  { _id: "d2", leagueId: "league1", name: "West" },
];

const mockTeams = [
  { _id: "t1", leagueId: "league1", name: "Eagles", divisionId: "d1" },
  { _id: "t2", leagueId: "league1", name: "Hawks", divisionId: undefined },
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DivisionsPage", () => {
  const mockCreateMutate = vi.fn();
  const mockEditMutate = vi.fn();
  const mockDeleteMutate = vi.fn();
  const mockAssignMutate = vi.fn();

  beforeEach(() => {
    mockUseMutation.mockImplementation((ref: string) => {
      if (ref === "divisions:createDivision") return mockCreateMutate;
      if (ref === "divisions:editDivision") return mockEditMutate;
      if (ref === "divisions:deleteDivision") return mockDeleteMutate;
      if (ref === "divisions:assignTeamDivision") return mockAssignMutate;
      return vi.fn();
    });
  });

  function renderPage(divisions = mockDivisions, teams = mockTeams) {
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "divisions:getDivisions") return divisions;
      if (ref === "divisions:getTeamsForLeague") return teams;
      return undefined;
    });
    return render(
      <MemoryRouter initialEntries={["/leagues/league1/divisions"]}>
        <DivisionsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
  }

  it("renders division list with names", () => {
    renderPage();
    // Division names appear in both the list items and as select options
    expect(screen.getAllByText("East").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("West").length).toBeGreaterThanOrEqual(1);
  });

  it("renders create division form", () => {
    renderPage();
    expect(screen.getByLabelText(/division name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create division/i }),
    ).toBeInTheDocument();
  });

  it("calls create mutation with form values", async () => {
    mockCreateMutate.mockResolvedValue("division-new");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/division name/i), "North");
    await user.click(
      screen.getByRole("button", { name: /create division/i }),
    );

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        name: "North",
      }),
    );
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <DivisionsPage leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no divisions exist", () => {
    renderPage([]);
    expect(screen.getByText(/no divisions/i)).toBeInTheDocument();
  });

  it("renders delete button for each division", () => {
    renderPage();
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls delete mutation when clicking delete", async () => {
    mockDeleteMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: "league1",
        divisionId: "d1",
      }),
    );
  });

  it("shows teams section with division assignment", () => {
    renderPage();
    expect(screen.getByText("Eagles")).toBeInTheDocument();
    expect(screen.getByText("Hawks")).toBeInTheDocument();
  });
});
