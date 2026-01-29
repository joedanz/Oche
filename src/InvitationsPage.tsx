// ABOUTME: League invitations management page for admins.
// ABOUTME: Allows generating invite links, viewing pending invites, and revoking invites.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface Invite {
  _id: string;
  code: string;
  role: string;
  used: boolean;
  expiresAt: number;
  createdBy: string;
}

interface InvitationsPageProps {
  leagueId: Id<"leagues">;
}

export function InvitationsPage({ leagueId }: InvitationsPageProps) {
  const invites = useQuery(api.invites.getLeagueInvites, { leagueId }) as Invite[] | undefined;
  const createInvite = useMutation(api.invites.createInvite);
  const revokeInvite = useMutation(api.invites.revokeInvite);
  const [selectedRole, setSelectedRole] = useState<"captain" | "player">("captain");

  if (invites === undefined) {
    return (
      <div className="min-h-screen bg-oche-900 px-6 py-12">
        <p className="text-oche-400">Loading…</p>
      </div>
    );
  }

  async function handleGenerate() {
    try {
      await createInvite({ leagueId, role: selectedRole });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create invite");
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await revokeInvite({ inviteId: inviteId as Id<"invites">, leagueId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to revoke invite");
    }
  }

  return (
    <div className="min-h-screen bg-oche-900 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl tracking-tight text-oche-100">
          Invitations
        </h1>

        <div className="mt-8 flex items-center gap-4">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as "captain" | "player")}
            className="rounded-md border border-oche-600 bg-oche-700 px-3 py-2 text-sm text-oche-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="captain">Captain</option>
            <option value="player">Player</option>
          </select>
          <button
            onClick={() => void handleGenerate()}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            Generate Invite
          </button>
        </div>

        {invites.length === 0 ? (
          <p className="mt-8 text-oche-400">No invitations yet.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {invites.map((invite) => (
              <div
                key={invite._id}
                className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-6 py-4"
              >
                <div>
                  <p className="font-mono text-oche-100">{invite.code}</p>
                  <p className="text-sm text-oche-400">
                    Role: <span className="capitalize">{invite.role}</span>
                    {invite.used && (
                      <span className="ml-2 text-oche-500">(used)</span>
                    )}
                  </p>
                </div>
                {!invite.used && (
                  <button
                    onClick={() => void handleRevoke(invite._id)}
                    className="rounded-md border border-red-700 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
