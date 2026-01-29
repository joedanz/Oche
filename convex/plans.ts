// ABOUTME: Plan tier definitions and limit configuration for the subscription system.
// ABOUTME: Pure data module — no DB access — defines what each plan allows.

export type PlanId = "starter" | "league" | "association";

export type Feature =
  | "historical_trends"
  | "csv_pdf_export"
  | "score_import"
  | "tournaments"
  | "public_pages"
  | "audit_log"
  | "full_handicapping"
  | "cross_league_stats"
  | "custom_branding";

export interface PlanLimits {
  maxLeagues: number;
  maxTeamsPerLeague: number;
  maxActiveSeasons: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  limits: PlanLimits;
  features: Set<Feature>;
}

const starterFeatures: Feature[] = [];

const leagueFeatures: Feature[] = [
  "historical_trends",
  "csv_pdf_export",
  "score_import",
  "tournaments",
  "public_pages",
  "audit_log",
  "full_handicapping",
];

const associationFeatures: Feature[] = [
  ...leagueFeatures,
  "cross_league_stats",
  "custom_branding",
];

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    limits: {
      maxLeagues: 1,
      maxTeamsPerLeague: 6,
      maxActiveSeasons: 1,
    },
    features: new Set(starterFeatures),
  },
  league: {
    id: "league",
    name: "League",
    monthlyPriceCents: 1200,
    yearlyPriceCents: 9900,
    limits: {
      maxLeagues: 3,
      maxTeamsPerLeague: Infinity,
      maxActiveSeasons: Infinity,
    },
    features: new Set(leagueFeatures),
  },
  association: {
    id: "association",
    name: "Association",
    monthlyPriceCents: 2900,
    yearlyPriceCents: 24900,
    limits: {
      maxLeagues: Infinity,
      maxTeamsPerLeague: Infinity,
      maxActiveSeasons: Infinity,
    },
    features: new Set(associationFeatures),
  },
};

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId];
}

export function hasFeature(planId: PlanId, feature: Feature): boolean {
  return PLANS[planId].features.has(feature);
}

export function checkLimit(
  planId: PlanId,
  limitKey: keyof PlanLimits,
  currentCount: number,
): boolean {
  return currentCount < PLANS[planId].limits[limitKey];
}
