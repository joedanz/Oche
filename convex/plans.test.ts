// ABOUTME: Tests for plan configuration and limit/feature checking.
// ABOUTME: Verifies tier definitions, feature access, and limit enforcement.

import { describe, it, expect } from "vitest";
import {
  PLANS,
  getPlan,
  hasFeature,
  checkLimit,
  type PlanId,
  type Feature,
} from "./plans";

describe("plans", () => {
  describe("PLANS configuration", () => {
    it("defines three tiers", () => {
      expect(Object.keys(PLANS)).toEqual(["starter", "league", "association"]);
    });

    it("starter is free", () => {
      expect(PLANS.starter.monthlyPriceCents).toBe(0);
      expect(PLANS.starter.yearlyPriceCents).toBe(0);
    });

    it("league costs $12/mo or $99/yr", () => {
      expect(PLANS.league.monthlyPriceCents).toBe(1200);
      expect(PLANS.league.yearlyPriceCents).toBe(9900);
    });

    it("association costs $29/mo or $249/yr", () => {
      expect(PLANS.association.monthlyPriceCents).toBe(2900);
      expect(PLANS.association.yearlyPriceCents).toBe(24900);
    });
  });

  describe("starter limits", () => {
    it("allows 1 league", () => {
      expect(PLANS.starter.limits.maxLeagues).toBe(1);
    });

    it("allows 6 teams per league", () => {
      expect(PLANS.starter.limits.maxTeamsPerLeague).toBe(6);
    });

    it("allows 1 active season", () => {
      expect(PLANS.starter.limits.maxActiveSeasons).toBe(1);
    });

    it("has no premium features", () => {
      expect(PLANS.starter.features.size).toBe(0);
    });
  });

  describe("league limits", () => {
    it("allows unlimited leagues", () => {
      expect(PLANS.league.limits.maxLeagues).toBe(Infinity);
    });

    it("allows unlimited teams", () => {
      expect(PLANS.league.limits.maxTeamsPerLeague).toBe(Infinity);
    });

    it("includes all pro features", () => {
      const expectedFeatures: Feature[] = [
        "historical_trends",
        "csv_pdf_export",
        "score_import",
        "tournaments",
        "public_pages",
        "audit_log",
        "full_handicapping",
      ];
      for (const f of expectedFeatures) {
        expect(PLANS.league.features.has(f)).toBe(true);
      }
    });

    it("does not include association-only features", () => {
      expect(PLANS.league.features.has("cross_league_stats")).toBe(false);
      expect(PLANS.league.features.has("custom_branding")).toBe(false);
    });
  });

  describe("association limits", () => {
    it("allows 10 leagues", () => {
      expect(PLANS.association.limits.maxLeagues).toBe(10);
    });

    it("includes all league features plus association features", () => {
      expect(PLANS.association.features.has("cross_league_stats")).toBe(true);
      expect(PLANS.association.features.has("custom_branding")).toBe(true);
      expect(PLANS.association.features.has("tournaments")).toBe(true);
    });
  });

  describe("getPlan", () => {
    it("returns the correct plan config", () => {
      expect(getPlan("starter").name).toBe("Starter");
      expect(getPlan("league").name).toBe("League");
      expect(getPlan("association").name).toBe("Association");
    });
  });

  describe("hasFeature", () => {
    it("returns false for starter on premium features", () => {
      expect(hasFeature("starter", "tournaments")).toBe(false);
      expect(hasFeature("starter", "score_import")).toBe(false);
      expect(hasFeature("starter", "csv_pdf_export")).toBe(false);
    });

    it("returns true for league on pro features", () => {
      expect(hasFeature("league", "tournaments")).toBe(true);
      expect(hasFeature("league", "score_import")).toBe(true);
    });

    it("returns false for league on association features", () => {
      expect(hasFeature("league", "cross_league_stats")).toBe(false);
    });

    it("returns true for association on all features", () => {
      expect(hasFeature("association", "tournaments")).toBe(true);
      expect(hasFeature("association", "cross_league_stats")).toBe(true);
    });
  });

  describe("checkLimit", () => {
    it("allows starter to create first league", () => {
      expect(checkLimit("starter", "maxLeagues", 0)).toBe(true);
    });

    it("blocks starter from creating second league", () => {
      expect(checkLimit("starter", "maxLeagues", 1)).toBe(false);
    });

    it("allows starter to add 6th team but blocks 7th", () => {
      expect(checkLimit("starter", "maxTeamsPerLeague", 5)).toBe(true);
      expect(checkLimit("starter", "maxTeamsPerLeague", 6)).toBe(false);
    });

    it("allows league plan unlimited leagues", () => {
      expect(checkLimit("league", "maxLeagues", 100)).toBe(true);
    });

    it("allows association up to 10 leagues", () => {
      expect(checkLimit("association", "maxLeagues", 9)).toBe(true);
      expect(checkLimit("association", "maxLeagues", 10)).toBe(false);
    });
  });
});
