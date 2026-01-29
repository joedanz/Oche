// ABOUTME: League members page showing all members with role assignment controls.
// ABOUTME: Admin-only page for viewing and changing member roles within a league.

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Member {
  _id: string;
  userId: Id<"users">;
  leagueId: Id<"leagues">;
  role: string;
  userName: string;
  userEmail: string;
}

interface MembersPageProps {
  leagueId: Id<"leagues">;
}

export function MembersPage({ leagueId }: MembersPageProps) {
  const members = useQuery(api.members.getMembersWithDetails, { leagueId }) as Member[] | undefined;
  const updateRole = useMutation(api.leagues.updateMemberRole);

  if (members === undefined) {
    return (
      <div className="min-h-screen bg-oche-900 px-6 py-12">
        <p className="text-oche-400">Loading…</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="min-h-screen bg-oche-900 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-3xl tracking-tight text-oche-100">
            Members
          </h1>
          <p className="mt-4 text-oche-400">No members in this league yet.</p>
        </div>
      </div>
    );
  }

  async function handleRoleChange(
    targetUserId: Id<"users">,
    newRole: string,
  ) {
    try {
      await updateRole({
        leagueId,
        targetUserId,
        newRole: newRole as "admin" | "captain" | "player",
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update role");
    }
  }

  return (
    <div className="min-h-screen bg-oche-900 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Members
        </h1>
        <div className="mt-8 space-y-4">
          {members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-6 py-4"
            >
              <div>
                <p className="text-oche-100 font-medium">{member.userName}</p>
                <p className="text-oche-400 text-sm">{member.userEmail}</p>
              </div>
              <select
                value={member.role}
                onChange={(e) =>
                  void handleRoleChange(member.userId, e.target.value)
                }
                className="rounded-md border border-oche-600 bg-oche-700 px-3 py-2 text-sm text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="admin">Admin</option>
                <option value="captain">Captain</option>
                <option value="player">Player</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
