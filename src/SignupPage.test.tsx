// ABOUTME: Tests for the signup page form
// ABOUTME: Verifies email, password, display name fields and validation
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SignupPage } from "./SignupPage";

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("SignupPage", () => {
  it("renders email, password, and display name fields", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: /sign up|create account/i }),
    ).toBeInTheDocument();
  });

  it("shows error when password is less than 8 characters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(
      screen.getByRole("button", { name: /sign up|create account/i }),
    );

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signIn with correct data on valid submission", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(
      screen.getByRole("button", { name: /sign up|create account/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("password", expect.any(FormData));
    const formData = mockSignIn.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("test@example.com");
    expect(formData.get("password")).toBe("password123");
    expect(formData.get("name")).toBe("Test User");
    expect(formData.get("flow")).toBe("signUp");
  });

  it("navigates to / after successful signup", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <SignupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(
      screen.getByRole("button", { name: /sign up|create account/i }),
    );

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("has a link to the login page", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /log in|sign in/i }),
    ).toHaveAttribute("href", "/login");
  });
});
