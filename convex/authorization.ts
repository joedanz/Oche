// ABOUTME: Role-based authorization helpers for league-scoped permissions.
// ABOUTME: Enforces Admin/Captain/Player roles via leagueMemberships table lookups.

import { DatabaseReader } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type Role = "admin" | "captain" | "player";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getMemberRole(
  db: DatabaseReader,
  userId: Id<"users">,
  leagueId: Id<"leagues">,
): Promise<Role | null> {
  const membership = await db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) =>
      q.eq("userId", userId).eq("leagueId", leagueId),
    )
    .unique();

  return membership ? (membership.role as Role) : null;
}

export async function requireLeagueMember(
  db: DatabaseReader,
  userId: Id<"users">,
  leagueId: Id<"leagues">,
) {
  const membership = await db
    .query("leagueMemberships")
    .withIndex("by_user_league", (q) =>
      q.eq("userId", userId).eq("leagueId", leagueId),
    )
    .unique();

  if (!membership) {
    throw new AuthorizationError("Not a member of this league");
  }

  return membership;
}

export async function requireRole(
  db: DatabaseReader,
  userId: Id<"users">,
  leagueId: Id<"leagues">,
  allowedRoles: Role[],
) {
  const membership = await requireLeagueMember(db, userId, leagueId);

  if (!allowedRoles.includes(membership.role as Role)) {
    throw new AuthorizationError(
      `Insufficient permissions: requires ${allowedRoles.join(" or ")} role`,
    );
  }

  return membership;
}
