// ABOUTME: User dashboard showing all leagues the user belongs to.
// ABOUTME: Displays league cards with role badges, empty state, and create/join actions.
import { Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface LeagueEntry {
  leagueId: string;
  leagueName: string;
  role: string;
}

export function Dashboard() {
  const { signOut } = useAuthActions();
  const leagues = useQuery(api.dashboard.getUserLeaguesWithDetails) as
    | LeagueEntry[]
    | undefined;

  return (
    <div className="min-h-screen bg-oche-900 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-tight text-oche-100">
            My Leagues
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/billing"
              className="rounded-md border border-oche-700 px-4 py-2 text-sm text-oche-300 transition hover:bg-oche-800 hover:text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
            >
              Billing
            </Link>
            <button
              onClick={() => void signOut()}
              className="rounded-md border border-oche-700 px-4 py-2 text-sm text-oche-300 transition hover:bg-oche-800 hover:text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
            >
              Log Out
            </button>
          </div>
        </div>

        {leagues === undefined ? null : leagues.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-lg text-oche-400">
              You're not part of any leagues yet.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                to="/create-league"
                className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-oche-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
              >
                Create a League
              </Link>
              <Link
                to="/create-league"
                className="rounded-md border border-oche-700 px-4 py-2 font-semibold text-oche-300 transition hover:bg-oche-800 hover:text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
              >
                Join a League
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex justify-end">
              <Link
                to="/create-league"
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-oche-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
              >
                Create New League
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {leagues.map((league) => (
                <li key={league.leagueId}>
                  <Link
                    to={`/leagues/${league.leagueId}`}
                    className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-5 py-4 transition hover:border-amber-500/40 hover:bg-oche-750 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-oche-900"
                  >
                    <span className="text-lg font-medium text-oche-100">
                      {league.leagueName}
                    </span>
                    <span className="rounded-full bg-oche-700 px-3 py-0.5 text-xs font-medium capitalize text-oche-300">
                      {league.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
