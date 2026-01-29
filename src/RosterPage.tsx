// ABOUTME: Team roster management page for captains and admins.
// ABOUTME: Allows adding, removing players, and toggling active/inactive status.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface RosterPageProps {
  leagueId: Id<"leagues">;
  teamId: Id<"teams">;
}

export function RosterPage({ leagueId, teamId }: RosterPageProps) {
  const roster = useQuery(api.roster.getRoster, { leagueId, teamId });
  const addPlayer = useMutation(api.roster.addPlayer);
  const removePlayer = useMutation(api.roster.removePlayer);
  const setPlayerStatus = useMutation(api.roster.setPlayerStatus);

  const [playerName, setPlayerName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [adding, setAdding] = useState(false);

  if (roster === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await addPlayer({
        leagueId,
        teamId,
        playerName: playerName.trim(),
        playerEmail: playerEmail.trim(),
      });
      setPlayerName("");
      setPlayerEmail("");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(playerId: Id<"players">) {
    await removePlayer({ leagueId, playerId });
  }

  async function handleToggleStatus(
    playerId: Id<"players">,
    currentStatus: string,
  ) {
    await setPlayerStatus({
      leagueId,
      playerId,
      status: currentStatus === "active" ? "inactive" : "active",
    });
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">Team Roster</h2>

      {roster.length === 0 ? (
        <p className="mb-6 text-oche-400">No players yet. Add one below.</p>
      ) : (
        <ul className="mb-8 space-y-3">
          {roster.map((player: any) => (
            <li
              key={player._id}
              className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-4 py-3"
            >
              <div>
                <span className="font-medium text-oche-100">
                  {player.userName}
                </span>
                <span className="ml-3 text-sm text-oche-400">
                  {player.userEmail}
                </span>
                <span
                  className={`ml-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    player.status === "active"
                      ? "bg-green-900 text-green-300"
                      : "bg-oche-700 text-oche-400"
                  }`}
                >
                  {player.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleToggleStatus(
                      player._id as Id<"players">,
                      player.status,
                    )
                  }
                  className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                >
                  {player.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleRemove(player._id as Id<"players">)}
                  className="rounded-md bg-red-900 px-3 py-1 text-sm text-red-300 transition hover:bg-red-800"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-oche-200">Add Player</h3>

        <div>
          <label
            htmlFor="playerName"
            className="block text-sm font-medium text-oche-300"
          >
            Name
          </label>
          <input
            id="playerName"
            type="text"
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Alice Smith…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="playerEmail"
            className="block text-sm font-medium text-oche-300"
          >
            Email
          </label>
          <input
            id="playerEmail"
            type="email"
            required
            value={playerEmail}
            onChange={(e) => setPlayerEmail(e.target.value)}
            placeholder="e.g. alice@example.com…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add Player"}
        </button>
      </form>
    </div>
  );
}
