// ABOUTME: Login page with email/password form and Google OAuth
// ABOUTME: Uses Convex auth signIn action to authenticate users
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

export function LoginPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("flow", "signIn");
    try {
      await signIn("password", formData);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      await signIn("google");
      navigate("/", { replace: true });
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-oche-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Log In
        </h1>
        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-oche-700 bg-oche-800 px-4 py-2 font-medium text-oche-100 transition hover:bg-oche-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-oche-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-oche-900 px-2 text-oche-500">or</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-oche-300"
            >
              Email
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="block text-sm font-medium text-oche-300"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            Log In
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-oche-400">
          Don&rsquo;t have an account?{" "}
          <Link
            to="/signup"
            className="text-amber-400 transition hover:text-amber-300"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
