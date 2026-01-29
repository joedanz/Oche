// ABOUTME: Tests for the core database schema definition.
// ABOUTME: Validates that all required tables and fields are defined correctly.

import { describe, it, expect } from "vitest";
import schema from "./schema";

describe("Core database schema", () => {
  const tableNames = Object.keys(schema.tables);

  it("defines all required tables", () => {
    const requiredTables = [
      "users",
      "leagues",
      "leagueMemberships",
      "invites",
      "seasons",
      "divisions",
      "teams",
      "players",
      "matches",
      "games",
      "innings",
      "playerStats",
      "tournaments",
      "notifications",
      "notificationPreferences",
      "auditLog",
      "subscriptions",
    ];

    for (const table of requiredTables) {
      expect(tableNames).toContain(table);
    }
  });

  it("does not define unexpected tables", () => {
    const allowedTables = [
      "users",
      "leagues",
      "leagueMemberships",
      "invites",
      "seasons",
      "divisions",
      "teams",
      "players",
      "matches",
      "games",
      "innings",
      "playerStats",
      "authAccounts",
      "authSessions",
      "authRefreshTokens",
      "authVerificationCodes",
      "authVerifiers",
      "authRateLimits",
      "scoreEntries",
      "importTemplates",
      "payments",
      "tournaments",
      "notifications",
      "notificationPreferences",
      "auditLog",
      "subscriptions",
    ];

    for (const table of tableNames) {
      expect(allowedTables).toContain(table);
    }
  });
});
