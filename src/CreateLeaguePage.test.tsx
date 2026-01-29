// ABOUTME: Tests for the CreateLeaguePage component.
// ABOUTME: Verifies form rendering, validation, and successful league creation.

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mockMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => mockMutate),
}));

vi.mock("../convex/_generated/api", () => ({
  api: { onboarding: { createLeague: "createLeague" } },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { CreateLeaguePage } from "./CreateLeaguePage";

describe("CreateLeaguePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders form with name and description fields", () => {
    render(
      <MemoryRouter>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/league name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create league/i }),
    ).toBeInTheDocument();
  });

  it("shows error when name is empty on submit", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /create league/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/league name/i);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits with name and description, then navigates to dashboard", async () => {
    const user = userEvent.setup();
    mockMutate.mockResolvedValue("league-123");
    render(
      <MemoryRouter>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/league name/i), "Friday Darts");
    await user.type(
      screen.getByLabelText(/description/i),
      "Weekly league at the pub",
    );
    await user.click(screen.getByRole("button", { name: /create league/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      name: "Friday Darts",
      description: "Weekly league at the pub",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("submits with empty description (optional field)", async () => {
    const user = userEvent.setup();
    mockMutate.mockResolvedValue("league-123");
    render(
      <MemoryRouter>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/league name/i), "Friday Darts");
    await user.click(screen.getByRole("button", { name: /create league/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      name: "Friday Darts",
      description: "",
    });
  });

  it("shows error message on mutation failure", async () => {
    const user = userEvent.setup();
    mockMutate.mockRejectedValue(new Error("fail"));
    render(
      <MemoryRouter>
        <CreateLeaguePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/league name/i), "Test");
    await user.click(screen.getByRole("button", { name: /create league/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/could not create/i);
  });
});
