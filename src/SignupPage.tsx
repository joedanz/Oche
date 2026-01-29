// ABOUTME: Signup page placeholder
// ABOUTME: Will be fully implemented in US-005 (email/password authentication)

import { Link } from "react-router-dom";

export function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-oche-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Create an Account
        </h1>
        <p className="mt-2 text-sm text-oche-400">
          Registration coming soon.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-amber-400 transition hover:text-amber-300"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
