// ABOUTME: Team management page for league admins.
// ABOUTME: Allows creating, editing teams, and assigning team captains.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface TeamsPageProps {
  leagueId: Id<"leagues">;
}

export function TeamsPage({ leagueId }: TeamsPageProps) {
  const teams = useQuery(api.teams.getTeams, { leagueId });
  const divisions = useQuery(api.divisions.getDivisions, { leagueId });
  const createTeam = useMutation(api.teams.createTeam);
  const editTeam = useMutation(api.teams.editTeam);
  const assignCaptain = useMutation(api.captains.assignCaptain);

  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editDivisionId, setEditDivisionId] = useState("");

  const [captainPickerTeamId, setCaptainPickerTeamId] = useState<string | null>(
    null,
  );

  if (teams === undefined || divisions === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createTeam({
        leagueId,
        name,
        venue: venue || undefined,
        divisionId: divisionId ? (divisionId as Id<"divisions">) : undefined,
      });
      setName("");
      setVenue("");
      setDivisionId("");
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(teamId: Id<"teams">) {
    await editTeam({
      leagueId,
      teamId,
      name: editName,
      venue: editVenue || undefined,
      divisionId: editDivisionId
        ? (editDivisionId as Id<"divisions">)
        : undefined,
    });
    setEditingId(null);
  }

  function startEdit(team: any) {
    setEditingId(team._id);
    setEditName(team.name);
    setEditVenue(team.venue ?? "");
    setEditDivisionId(team.divisionId ?? "");
  }

  async function handleAssignCaptain(
    teamId: Id<"teams">,
    playerId: Id<"players">,
  ) {
    await assignCaptain({ leagueId, teamId, playerId });
    setCaptainPickerTeamId(null);
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">Teams</h2>

      {teams.length === 0 ? (
        <p className="mb-6 text-oche-400">
          No teams yet. Create one below.
        </p>
      ) : (
        <ul className="mb-8 space-y-3">
          {teams.map((team) => (
            <li
              key={team._id}
              className="rounded-lg border border-oche-700 bg-oche-800 px-4 py-3"
            >
              {editingId === team._id ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor={`editName-${team._id}`}
                      className="block text-sm font-medium text-oche-300"
                    >
                      Edit team name
                    </label>
                    <input
                      id={`editName-${team._id}`}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-1 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`editVenue-${team._id}`}
                      className="block text-sm font-medium text-oche-300"
                    >
                      Edit venue
                    </label>
                    <input
                      id={`editVenue-${team._id}`}
                      type="text"
                      value={editVenue}
                      onChange={(e) => setEditVenue(e.target.value)}
                      className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-1 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`editDivision-${team._id}`}
                      className="block text-sm font-medium text-oche-300"
                    >
                      Edit division
                    </label>
                    <select
                      id={`editDivision-${team._id}`}
                      value={editDivisionId}
                      onChange={(e) => setEditDivisionId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-1 text-oche-100"
                    >
                      <option value="">No division</option>
                      {divisions.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(team._id as Id<"teams">)}
                      className="rounded-md bg-amber-600 px-3 py-1 text-sm text-white transition hover:bg-amber-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-oche-100">
                        {team.name}
                      </span>
                      {(team as any).venue && (
                        <span className="ml-3 text-sm text-oche-400">
                          {(team as any).venue}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/leagues/${leagueId}/teams/${team._id}/roster`}
                        className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                      >
                        Roster
                      </Link>
                      <Link
                        to={`/leagues/${leagueId}/teams/${team._id}/stats`}
                        className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                      >
                        Stats
                      </Link>
                      <button
                        onClick={() =>
                          setCaptainPickerTeamId(
                            captainPickerTeamId === team._id
                              ? null
                              : team._id,
                          )
                        }
                        className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                      >
                        Set Captain
                      </button>
                      <button
                        onClick={() => startEdit(team)}
                        className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-oche-400">
                    {(team as any).captainName
                      ? `Captain: ${(team as any).captainName}`
                      : "No captain"}
                  </p>
                  {captainPickerTeamId === team._id && (
                    <CaptainPicker
                      leagueId={leagueId}
                      teamId={team._id as Id<"teams">}
                      onSelect={(playerId) =>
                        handleAssignCaptain(
                          team._id as Id<"teams">,
                          playerId,
                        )
                      }
                      onCancel={() => setCaptainPickerTeamId(null)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-oche-200">Create Team</h3>

        <div>
          <label
            htmlFor="teamName"
            className="block text-sm font-medium text-oche-300"
          >
            Team name
          </label>
          <input
            id="teamName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Eagles…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="teamVenue"
            className="block text-sm font-medium text-oche-300"
          >
            Venue / bar name
          </label>
          <input
            id="teamVenue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. The Pub…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="teamDivision"
            className="block text-sm font-medium text-oche-300"
          >
            Division
          </label>
          <select
            id="teamDivision"
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100"
          >
            <option value="">No division</option>
            {divisions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Team"}
        </button>
      </form>
    </div>
  );
}

function CaptainPicker({
  leagueId,
  teamId,
  onSelect,
  onCancel,
}: {
  leagueId: Id<"leagues">;
  teamId: Id<"teams">;
  onSelect: (playerId: Id<"players">) => void;
  onCancel: () => void;
}) {
  const players = useQuery(api.captains.getTeamPlayers, { leagueId, teamId });

  if (players === undefined) {
    return <p className="mt-2 text-sm text-oche-400">Loading players…</p>;
  }

  if (players.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-sm text-oche-400">
          No players on this team. Add players first.
        </p>
        <button
          onClick={onCancel}
          className="mt-1 text-sm text-oche-300 underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <p className="text-sm font-medium text-oche-300">Select captain:</p>
      {players
        .filter((p: any) => p.status === "active")
        .map((player: any) => (
          <button
            key={player._id}
            onClick={() => onSelect(player._id as Id<"players">)}
            className="block w-full rounded-md px-3 py-1 text-left text-sm text-oche-100 transition hover:bg-oche-700"
          >
            {player.userName}
          </button>
        ))}
      <button
        onClick={onCancel}
        className="text-sm text-oche-400 underline"
      >
        Cancel
      </button>
    </div>
  );
}
