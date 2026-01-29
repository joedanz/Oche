// ABOUTME: Compelling upgrade card shown when users try to access plan-gated features.
// ABOUTME: Mirrors LandingPage pricing card aesthetic with shimmer border and feature list.

import { Link } from "react-router-dom";

interface UpgradePromptProps {
  feature: string;
  description: string;
}

const LEAGUE_FEATURES = [
  "Up to 3 leagues, unlimited teams",
  "Historical trends & export",
  "Score import (CSV, Excel)",
  "Tournaments",
  "Public league pages",
  "Audit log",
  "Full handicapping",
];

const checkIcon = (
  <svg className="size-5 shrink-0 text-green-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
);

const lockIcon = (
  <svg className="size-10 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3A5.25 5.25 0 0 0 12 1.5Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
  </svg>
);

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/50 bg-oche-850 p-8">
        <div className="pricing-glow absolute -inset-[1px] rounded-2xl opacity-40" />
        <div className="absolute -inset-4 rounded-3xl bg-amber-500/5 blur-xl" />

        <div className="relative text-center">
          <div className="mb-4 inline-block">{lockIcon}</div>

          <h2 className="font-display text-2xl tracking-tight text-oche-100">
            Unlock {feature}
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm text-oche-400">
            {description}
          </p>

          <div className="mt-4 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            Included with League plan
          </div>

          <ul className="mt-6 space-y-3 text-left text-sm text-oche-300">
            {LEAGUE_FEATURES.map((item) => (
              <li
                key={item}
                className={`flex items-center gap-3 ${item.toLowerCase().includes(feature.toLowerCase()) ? "text-amber-300 font-medium" : ""}`}
              >
                {checkIcon}
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-oche-500">
            $12/mo · $99/yr
          </p>

          <Link
            to="/billing"
            className="mt-4 inline-block rounded-xl bg-amber-500 px-8 py-3 font-semibold text-oche-900 shadow-md shadow-amber-500/20 transition-all duration-300 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-400/25"
          >
            Upgrade to League
          </Link>

          <p className="mt-3">
            <Link to="/billing" className="text-xs text-oche-500 transition hover:text-oche-300">
              Compare all plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
