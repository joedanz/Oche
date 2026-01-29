// ABOUTME: Marketing landing page for Oche
// ABOUTME: Public page with hero, features, social proof, pricing, and footer

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

// ── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    title: "Score Entry",
    description:
      "Digital scoresheets that mirror paper. Enter runs inning-by-inning with a grid that feels familiar.",
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
    glowColor: "rgba(251, 191, 36, 0.06)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12h7.5m-7.5 0c0 .621.504 1.125 1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5" />
      </svg>
    ),
  },
  {
    title: "Real-Time Stats",
    description:
      "Averages, plus/minus, high innings, and leaderboards calculated the instant scores are entered.",
    accent: "text-green-400",
    accentBg: "bg-green-400/10",
    glowColor: "rgba(74, 222, 128, 0.06)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    title: "Scheduling",
    description:
      "Round-robin generation, match management, and player pairings. One place for your whole season.",
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
    glowColor: "rgba(251, 191, 36, 0.06)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: "Handicapping",
    description:
      "Configurable spot runs based on averages. Every matchup stays competitive, no matter the skill gap.",
    accent: "text-red-400",
    accentBg: "bg-red-400/10",
    glowColor: "rgba(248, 113, 113, 0.06)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97 7.87 15.696c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97Z" />
      </svg>
    ),
  },
];

const stats = [
  { value: "1,200+", label: "Games scored" },
  { value: "48", label: "Active leagues" },
  { value: "850+", label: "Players" },
  { value: "99.9%", label: "Uptime" },
];

const checkIcon = (
  <svg className="size-5 shrink-0 text-green-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
);

// ── Score grid with live animation ──────────────────────────────────────────

const COMPLETE_INNINGS: [number[], number[]] = [
  [3, 6, 0, 9, 2, 7, 4, 1, 5],
  [5, 2, 8, 1, 6, 0, 3, 9, 4],
];

function ScoreGridDemo() {
  const [revealed, setRevealed] = useState(0);
  const [animatingCell, setAnimatingCell] = useState(-1);
  const totalCells = 18;
  const names = ["M. Sullivan", "R. Torres"];

  useEffect(() => {
    if (revealed >= totalCells) return;
    const delay = revealed === 0 ? 1200 : 300 + Math.random() * 400;
    const timer = setTimeout(() => {
      setAnimatingCell(revealed);
      setTimeout(() => setAnimatingCell(-1), 500);
      setRevealed((r) => r + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [revealed]);

  const getCell = (playerIdx: number, inningIdx: number) => {
    const cellIndex = playerIdx * 9 + inningIdx;
    if (cellIndex < revealed) return COMPLETE_INNINGS[playerIdx][inningIdx];
    return null;
  };

  const isCursorCell = (playerIdx: number, inningIdx: number) => {
    const cellIndex = playerIdx * 9 + inningIdx;
    return cellIndex === revealed && revealed < totalCells;
  };

  const isAnimating = (playerIdx: number, inningIdx: number) => {
    return playerIdx * 9 + inningIdx === animatingCell;
  };

  const calcPlus = (playerIdx: number) => {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const val = getCell(playerIdx, i);
      if (val !== null) sum += val;
    }
    return sum;
  };

  const calcMinus = (playerIdx: number) => {
    return calcPlus(1 - playerIdx);
  };

  return (
    <div className="relative">
      {/* Ambient glow behind grid */}
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-amber-500/5 blur-2xl" />

      <div className="relative overflow-hidden rounded-xl border border-oche-700/50 bg-oche-850 font-mono text-sm shadow-2xl shadow-black/50">
        {/* Header row */}
        <div className="grid grid-cols-[120px_repeat(9,1fr)_60px_60px_60px] border-b border-oche-700/50 bg-oche-800 text-xs font-semibold text-oche-500">
          <div className="px-3 py-2.5" />
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="py-2.5 text-center tabular-nums">
              {i + 1}
            </div>
          ))}
          <div className="py-2.5 text-center text-green-400/70">+</div>
          <div className="py-2.5 text-center text-red-400/70">&minus;</div>
          <div className="py-2.5 text-center text-amber-400/70">T</div>
        </div>

        {/* Player rows */}
        {[0, 1].map((playerIdx) => {
          const plus = calcPlus(playerIdx);
          const minus = calcMinus(playerIdx);
          const total = plus - minus;
          const hasAnyCell = Array.from({ length: 9 }, (_, i) => getCell(playerIdx, i)).some(
            (v) => v !== null,
          );

          return (
            <div
              key={playerIdx}
              className={`grid grid-cols-[120px_repeat(9,1fr)_60px_60px_60px] border-b border-oche-700/30 ${playerIdx === 0 ? "bg-oche-850" : "bg-oche-800/40"}`}
            >
              <div className="truncate px-3 py-3 text-oche-300">{names[playerIdx]}</div>
              {Array.from({ length: 9 }, (_, i) => {
                const val = getCell(playerIdx, i);
                const cursor = isCursorCell(playerIdx, i);
                const anim = isAnimating(playerIdx, i);

                return (
                  <div
                    key={i}
                    className={`relative py-3 text-center ${
                      val === 9
                        ? "font-bold text-amber-400"
                        : val !== null
                          ? "text-oche-300"
                          : "text-oche-700"
                    } ${anim ? "animate-score-enter" : ""}`}
                  >
                    {val !== null ? val : cursor ? (
                      <span className="grid-cursor inline-block h-4 w-px bg-amber-400" />
                    ) : null}
                  </div>
                );
              })}
              <div className={`py-3 text-center font-semibold tabular-nums ${hasAnyCell ? "text-green-400" : "text-oche-700"}`}>
                {hasAnyCell ? plus : ""}
              </div>
              <div className={`py-3 text-center font-semibold tabular-nums ${hasAnyCell ? "text-red-400" : "text-oche-700"}`}>
                {hasAnyCell ? minus : ""}
              </div>
              <div className={`py-3 text-center font-bold tabular-nums ${hasAnyCell ? "text-amber-400" : "text-oche-700"}`}>
                {hasAnyCell ? `${total > 0 ? "+" : ""}${total}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feature card with mouse-tracking glow ───────────────────────────────────

function FeatureCard({
  feature,
}: {
  feature: (typeof features)[number];
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="feature-card group rounded-2xl border border-oche-700/40 bg-oche-850 p-8 transition-all duration-300 hover:border-oche-600 hover:shadow-lg hover:shadow-black/20"
      style={{ "--glow-color": feature.glowColor } as React.CSSProperties}
    >
      <div className="relative z-10">
        <div
          className={`mb-5 inline-flex rounded-xl ${feature.accentBg} p-3 ${feature.accent} ring-1 ring-inset ring-current/10 transition-transform duration-300 group-hover:scale-110`}
        >
          {feature.icon}
        </div>
        <h3 className="text-xl font-bold text-oche-100">{feature.title}</h3>
        <p className="mt-2 leading-relaxed text-oche-400">{feature.description}</p>
      </div>
    </div>
  );
}

// ── Dartboard ring pattern (SVG) ────────────────────────────────────────────

function DartboardRings() {
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]"
      width="900"
      height="900"
      viewBox="0 0 900 900"
      fill="none"
    >
      {[400, 320, 240, 160, 80, 30].map((r) => (
        <circle
          key={r}
          cx="450"
          cy="450"
          r={r}
          stroke="currentColor"
          strokeWidth="1"
          className="text-amber-400"
        />
      ))}
      {/* Crosshairs */}
      <line x1="450" y1="50" x2="450" y2="850" stroke="currentColor" strokeWidth="0.5" className="text-amber-400" />
      <line x1="50" y1="450" x2="850" y2="450" stroke="currentColor" strokeWidth="0.5" className="text-amber-400" />
    </svg>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="noise-overlay min-h-screen bg-oche-900 text-oche-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-oche-700/40 bg-oche-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="font-display text-2xl tracking-tight text-oche-100">
            OCHE
          </a>
          <nav className="flex items-center gap-6">
            <Link
              to="/login"
              className="text-sm font-medium text-oche-400 transition hover:text-oche-100"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-oche-900 shadow-md shadow-amber-500/20 transition hover:bg-amber-400 hover:shadow-amber-400/25"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:py-40">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-amber-500/10 blur-[120px]" />
            <div className="absolute -right-32 top-1/4 h-[400px] w-[500px] rounded-full bg-red-500/6 blur-[100px]" />
            <div className="absolute -left-32 top-1/3 h-[300px] w-[400px] rounded-full bg-amber-600/5 blur-[80px]" />
          </div>

          {/* Dartboard rings */}
          <DartboardRings />

          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 animate-fade-in-up text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                Darts league management
              </p>
              <h1 className="animate-fade-in-up font-display text-5xl leading-[1.1] tracking-tight [animation-delay:100ms] sm:text-6xl lg:text-7xl">
                Your league,{" "}
                <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                  digitized.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl animate-fade-in-up text-lg leading-relaxed text-oche-400 [animation-delay:200ms] sm:text-xl">
                Oche replaces paper scoresheets and spreadsheets with one app
                for scoring, stats, scheduling, and standings.
              </p>
              <div className="mt-10 flex animate-fade-in-up flex-col items-center gap-4 [animation-delay:300ms] sm:flex-row sm:justify-center">
                <Link
                  to="/signup"
                  className="group relative rounded-xl bg-amber-500 px-8 py-3.5 font-semibold text-oche-900 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-400/30"
                >
                  Start Your League
                </Link>
                <a
                  href="#features"
                  className="rounded-xl border border-oche-600 px-8 py-3.5 font-semibold text-oche-300 transition-all duration-300 hover:border-oche-400 hover:bg-oche-800/50 hover:text-oche-100"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Score grid demo */}
            <div className="mx-auto mt-20 hidden max-w-3xl animate-fade-in-up [animation-delay:500ms] md:block">
              <ScoreGridDemo />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative border-t border-oche-700/30 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
                Features
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
                Everything your league needs
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-oche-400">
                From the first dart thrown to the final standings. Score entry,
                statistics, scheduling, and handicapping in one place.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <FeatureCard key={f.title} feature={f} />
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="border-t border-oche-700/30 bg-oche-850 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Trusted by leagues
            </p>
            <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {stats.map((s, i) => (
                <div key={s.label} className="relative text-center">
                  {/* Vertical divider between stats (not before first) */}
                  {i > 0 && (
                    <div className="absolute -left-4 top-1/2 hidden h-12 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-oche-700 to-transparent sm:block" />
                  )}
                  <div className="font-mono text-4xl font-bold tabular-nums text-oche-100 sm:text-5xl">
                    {s.value}
                  </div>
                  <div className="mt-3 text-sm font-medium uppercase tracking-wider text-oche-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-oche-700/30 px-6 py-24">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
              Pricing
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
              Free to start. Upgrade when you're ready.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-oche-400">
              Create your league, invite your teams, and start scoring. Pay only
              when you need more.
            </p>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
              {/* Starter */}
              <div className="rounded-2xl border border-oche-700/40 bg-oche-850 p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-oche-400">
                  Starter
                </p>
                <p className="mt-4 font-display text-5xl text-oche-100">$0</p>
                <p className="mt-1 text-sm text-oche-500">free forever</p>
                <ul className="mt-8 space-y-3 text-left text-sm text-oche-300">
                  {[
                    "1 league, 6 teams",
                    "Full score entry grid",
                    "Basic stats & standings",
                    "Schedule & pairings",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      {checkIcon}
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="mt-10 block rounded-xl border border-oche-600 px-6 py-3 text-center font-semibold text-oche-300 transition-all duration-300 hover:border-oche-400 hover:text-oche-100"
                >
                  Get Started
                </Link>
              </div>

              {/* League (Pro) — highlighted */}
              <div className="relative rounded-2xl border border-amber-500/50 bg-oche-850 p-8">
                <div className="pricing-glow absolute -inset-[1px] rounded-2xl opacity-40" />
                <div className="absolute -inset-4 rounded-3xl bg-amber-500/5 blur-xl" />
                <div className="relative">
                  <div className="mb-2 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                    Most Popular
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                    League
                  </p>
                  <p className="mt-4 font-display text-5xl text-oche-100">$12</p>
                  <p className="mt-1 text-sm text-oche-500">per month · $99/year</p>
                  <ul className="mt-8 space-y-3 text-left text-sm text-oche-300">
                    {[
                      "Up to 3 leagues, unlimited teams",
                      "Historical trends & export",
                      "Score import (CSV, Excel)",
                      "Tournaments",
                      "Public league pages",
                      "Audit log",
                      "Full handicapping",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        {checkIcon}
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className="mt-10 block rounded-xl bg-amber-500 px-6 py-3 text-center font-semibold text-oche-900 shadow-md shadow-amber-500/20 transition-all duration-300 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-400/25"
                  >
                    Start Free Trial
                  </Link>
                </div>
              </div>

              {/* Association */}
              <div className="rounded-2xl border border-oche-700/40 bg-oche-850 p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-oche-400">
                  Association
                </p>
                <p className="mt-4 font-display text-5xl text-oche-100">$29</p>
                <p className="mt-1 text-sm text-oche-500">per month · $249/year</p>
                <ul className="mt-8 space-y-3 text-left text-sm text-oche-300">
                  {[
                    "Unlimited leagues",
                    "Everything in League",
                    "Cross-league stats",
                    "Custom branding",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      {checkIcon}
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="mt-10 block rounded-xl border border-oche-600 px-6 py-3 text-center font-semibold text-oche-300 transition-all duration-300 hover:border-oche-400 hover:text-oche-100"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t border-oche-700/30 bg-oche-850 px-6 py-24">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/6 blur-[100px]" />
          </div>
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Ready to ditch the spreadsheets?
            </h2>
            <p className="mt-4 text-oche-400">
              Set up your league in minutes. Your first season is on us.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-block rounded-xl bg-amber-500 px-8 py-3.5 font-semibold text-oche-900 shadow-lg shadow-amber-500/25 transition-all duration-300 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-400/30"
            >
              Start Your League
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-oche-700/30 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <span className="font-display text-lg tracking-tight text-oche-300">OCHE</span>
            <p className="mt-1 text-xs text-oche-600">
              American Baseball Darts league management
            </p>
          </div>
          <nav className="flex gap-8 text-sm text-oche-500">
            <Link to="/login" className="transition hover:text-oche-200">
              Log In
            </Link>
            <Link to="/signup" className="transition hover:text-oche-200">
              Sign Up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
