// ABOUTME: Marketing landing page for Oche
// ABOUTME: Public page with hero, features, social proof, pricing, and footer

const features = [
  {
    title: "Score Entry",
    description:
      "Digital scoresheets that mirror paper. Enter runs inning-by-inning with a grid that feels familiar.",
  },
  {
    title: "Real-Time Stats",
    description:
      "Averages, plus/minus, high innings, and leaderboards — all calculated automatically.",
  },
  {
    title: "Scheduling",
    description:
      "Round-robin schedule generation, match management, and player pairings in one place.",
  },
  {
    title: "Handicapping",
    description:
      "Configurable handicap rules so every matchup is competitive, no matter the skill gap.",
  },
];

export function LandingPage() {
  return (
    <>
      <main className="min-h-screen">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:py-32">
          <h1 className="max-w-2xl text-5xl font-bold tracking-tight sm:text-6xl">
            Your darts league,{" "}
            <span className="text-blue-600">digitized.</span>
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            Oche replaces paper scoresheets, spreadsheets, and group texts with
            one app for scoring, stats, scheduling, and standings.
          </p>
          <a
            href="/signup"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Get Started
          </a>
        </section>

        {/* Features */}
        <section className="bg-gray-50 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything your league needs
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {features.map((f) => (
                <div key={f.title} className="rounded-lg bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
                  <p className="text-gray-600">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="px-4 py-20 text-center">
          <p className="text-lg text-gray-600">
            Trusted by leagues and teams across the country.
          </p>
        </section>

        {/* Pricing */}
        <section className="bg-gray-50 px-4 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold">Simple pricing</h2>
          <p className="mb-8 text-lg text-gray-600">
            Free to start. No credit card required.
          </p>
          <div className="mx-auto max-w-sm rounded-lg bg-white p-8 shadow-sm">
            <p className="mb-2 text-4xl font-bold">$0</p>
            <p className="text-gray-600">
              Create your league, invite your teams, and start scoring — all for
              free.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-semibold">Oche</p>
          <nav className="flex gap-6 text-sm text-gray-600">
            <a href="/login" className="hover:text-gray-900">
              Log In
            </a>
            <a href="/signup" className="hover:text-gray-900">
              Sign Up
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
