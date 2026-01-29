// ABOUTME: Public-facing league page showing standings, schedule, and results.
// ABOUTME: Accessible without authentication for leagues marked as public.

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Props {
  leagueId: Id<"leagues">;
}

export function PublicLeaguePage({ leagueId }: Props) {
  const data = useQuery(api.publicLeague.getPublicLeagueData, { leagueId });

  if (data === undefined) {
    return <div className="p-6 text-oche-300">Loading…</div>;
  }

  if (data === null) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-oche-100 mb-2">League Not Available</h1>
        <p className="text-oche-400">This league is not public or does not exist.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-oche-100 mb-6">{data.leagueName}</h1>

      {/* Standings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-oche-200 mb-3">Standings</h2>
        {data.standings.length === 0 ? (
          <p className="text-oche-400">No standings data yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-oche-700 text-oche-400 text-sm">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4 font-variant-numeric tabular-nums">Pts</th>
                <th className="py-2 pr-4 font-variant-numeric tabular-nums">Wins</th>
                <th className="py-2 pr-4 font-variant-numeric tabular-nums">Runs</th>
                <th className="py-2 font-variant-numeric tabular-nums">+/-</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((entry: any) => (
                <tr key={entry.teamName} className="border-b border-oche-800 text-oche-200">
                  <td className="py-2 pr-4 tabular-nums">{entry.rank}</td>
                  <td className="py-2 pr-4 font-medium">{entry.teamName}</td>
                  <td className="py-2 pr-4 tabular-nums">{entry.matchPoints}</td>
                  <td className="py-2 pr-4 tabular-nums">{entry.gameWins}</td>
                  <td className="py-2 pr-4 tabular-nums">{entry.totalRunsScored}</td>
                  <td className="py-2 tabular-nums">{entry.plusMinus >= 0 ? `+${entry.plusMinus}` : entry.plusMinus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Upcoming Schedule */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-oche-200 mb-3">Upcoming Schedule</h2>
        {data.schedule.length === 0 ? (
          <p className="text-oche-400">No upcoming matches.</p>
        ) : (
          <div className="space-y-2">
            {data.schedule.map((match: any) => (
              <div key={match.matchId} className="flex items-center justify-between bg-oche-900 rounded p-3">
                <span className="text-oche-200">{match.homeTeam} vs {match.visitorTeam}</span>
                <span className="text-oche-400 text-sm">{match.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section>
        <h2 className="text-xl font-semibold text-oche-200 mb-3">Recent Results</h2>
        {data.recentResults.length === 0 ? (
          <p className="text-oche-400">No results yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentResults.map((result: any) => (
              <div key={result.matchId} className="flex items-center justify-between bg-oche-900 rounded p-3">
                <span className="text-oche-200">
                  {result.homeTeam} <span className="font-bold tabular-nums">{result.homePoints}</span>
                  {" - "}
                  <span className="font-bold tabular-nums">{result.visitorPoints}</span> {result.visitorTeam}
                </span>
                <span className="text-oche-400 text-sm">{result.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
