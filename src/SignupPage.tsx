// ABOUTME: Signup page with email, password, and display name form
// ABOUTME: Validates password requirements and creates account via Convex auth
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignupPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    formData.set("flow", "signUp");
    try {
      await signIn("password", formData);
      navigate("/", { replace: true });
    } catch {
      setError("Could not create account. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-oche-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Create an Account
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="signup-name"
              className="block text-sm font-medium text-oche-300"
            >
              Display Name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-oche-300"
            >
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              spellCheck={false}
              className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-oche-300"
            >
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full rounded-md border border-oche-700 bg-oche-800 px-3 py-2 text-oche-100 placeholder:text-oche-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-amber-500 px-4 py-2 font-semibold text-oche-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-oche-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-amber-400 transition hover:text-amber-300"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
