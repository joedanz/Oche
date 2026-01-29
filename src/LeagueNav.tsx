// ABOUTME: Sidebar navigation for league-scoped pages.
// ABOUTME: Shows grouped links to league sections with active-route highlighting.

import { NavLink } from "react-router-dom";

interface LeagueNavProps {
  leagueId: string;
}

const sections = [
  {
    label: "Play",
    items: [
      { name: "Schedule", path: "schedule" },
      { name: "Tournaments", path: "tournaments" },
    ],
  },
  {
    label: "Stats",
    items: [
      { name: "Standings", path: "standings" },
      { name: "Leaderboards", path: "leaderboards" },
      { name: "Trends", path: "trends" },
    ],
  },
  {
    label: "League",
    items: [
      { name: "Teams", path: "teams" },
      { name: "Seasons", path: "seasons" },
      { name: "Divisions", path: "divisions" },
      { name: "Members", path: "members" },
      { name: "Invitations", path: "invitations" },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Match Config", path: "settings" },
      { name: "Handicap", path: "handicap" },
      { name: "Payments", path: "payments" },
      { name: "Notifications", path: "notifications" },
      { name: "Visibility", path: "visibility" },
      { name: "Audit Log", path: "audit-log" },
    ],
  },
];

export function LeagueNav({ leagueId }: LeagueNavProps) {
  const base = `/leagues/${leagueId}`;

  return (
    <nav aria-label="League sections" className="w-48 shrink-0">
      {sections.map((section) => (
        <div key={section.label} className="mb-4">
          <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-oche-500">
            {section.label}
          </h3>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={`${base}/${item.path}`}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-1.5 text-sm transition ${
                      isActive
                        ? "bg-amber-500/10 font-medium text-amber-400"
                        : "text-oche-300 hover:bg-oche-800 hover:text-oche-100"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
