// ABOUTME: Tests for the league visibility toggle component.
// ABOUTME: Validates admin can toggle league between private and public.

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LeagueVisibilityToggle } from "./LeagueVisibilityToggle";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

vi.mock("./usePlan", () => ({
  usePlan: () => ({ isLoading: false, canUse: () => true }),
}));

vi.mock("../convex/_generated/api", () => ({
  api: {
    publicLeague: {
      toggleVisibility: "publicLeague:toggleVisibility",
      getPublicLeagueData: "publicLeague:getPublicLeagueData",
    },
    leagues: {
      getLeague: "leagues:getLeague",
    },
  },
}));

afterEach(cleanup);

describe("LeagueVisibilityToggle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows current visibility as private", () => {
    mockUseQuery.mockReturnValue({ isPublic: false });
    const toggle = vi.fn();
    mockUseMutation.mockReturnValue(toggle);
    render(
      <MemoryRouter>
        <LeagueVisibilityToggle leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/private/i)).toBeInTheDocument();
  });

  it("shows current visibility as public with shareable URL", () => {
    mockUseQuery.mockReturnValue({ isPublic: true });
    mockUseMutation.mockReturnValue(vi.fn());
    render(
      <MemoryRouter>
        <LeagueVisibilityToggle leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/public/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/public\/league1/)).toBeInTheDocument();
  });

  it("calls toggle mutation when button is clicked", () => {
    mockUseQuery.mockReturnValue({ isPublic: false });
    const toggle = vi.fn();
    mockUseMutation.mockReturnValue(toggle);
    render(
      <MemoryRouter>
        <LeagueVisibilityToggle leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /make public/i }));
    expect(toggle).toHaveBeenCalledWith({ leagueId: "league1", isPublic: true });
  });

  it("calls toggle to make private when currently public", () => {
    mockUseQuery.mockReturnValue({ isPublic: true });
    const toggle = vi.fn();
    mockUseMutation.mockReturnValue(toggle);
    render(
      <MemoryRouter>
        <LeagueVisibilityToggle leagueId={"league1" as any} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /make private/i }));
    expect(toggle).toHaveBeenCalledWith({ leagueId: "league1", isPublic: false });
  });
});
