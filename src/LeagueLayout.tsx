// ABOUTME: Layout wrapper for league-scoped pages with a league switcher in the header.
// ABOUTME: Active league is determined by URL param; switching navigates to the selected league.

import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface LeagueEntry {
  leagueId: string;
  leagueName: string;
  role: string;
}

export function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const leagues = useQuery(api.dashboard.getUserLeaguesWithDetails) as
    | LeagueEntry[]
    | undefined;

  const activeLeague = leagues?.find((l) => l.leagueId === leagueId);

  function handleSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    if (newId !== leagueId) {
      navigate(`/leagues/${newId}`, { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-oche-900">
      <header className="border-b border-oche-700 bg-oche-800 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-oche-400 transition hover:text-oche-200"
            >
              My Leagues
            </Link>
            <span className="text-oche-600" aria-hidden="true">
              /
            </span>
            <span className="font-medium text-oche-100">
              {activeLeague?.leagueName ?? ""}
            </span>
          </div>
          {leagues && leagues.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-oche-400">
              <select
                aria-label="Switch league"
                value={leagueId}
                onChange={handleSwitch}
                className="rounded-md border border-oche-600 bg-oche-700 px-3 py-1.5 text-sm text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {leagues.map((l) => (
                  <option key={l.leagueId} value={l.leagueId}>
                    {l.leagueName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
