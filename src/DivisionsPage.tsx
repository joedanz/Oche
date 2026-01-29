// ABOUTME: Division management page for league admins.
// ABOUTME: Allows creating, editing, deleting divisions and assigning teams to divisions.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface DivisionsPageProps {
  leagueId: Id<"leagues">;
}

export function DivisionsPage({ leagueId }: DivisionsPageProps) {
  const divisions = useQuery(api.divisions.getDivisions, { leagueId });
  const teams = useQuery(api.divisions.getTeamsForLeague, { leagueId });
  const createDivision = useMutation(api.divisions.createDivision);
  const editDivision = useMutation(api.divisions.editDivision);
  const deleteDivision = useMutation(api.divisions.deleteDivision);
  const assignTeamDivision = useMutation(api.divisions.assignTeamDivision);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (divisions === undefined || teams === undefined) {
    return <p className="text-oche-400">Loading…</p>;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createDivision({ leagueId, name });
      setName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(divisionId: Id<"divisions">) {
    await editDivision({ leagueId, divisionId, name: editName });
    setEditingId(null);
    setEditName("");
  }

  async function handleDelete(divisionId: Id<"divisions">) {
    await deleteDivision({ leagueId, divisionId });
  }

  async function handleAssign(teamId: Id<"teams">, divisionId: string) {
    await assignTeamDivision({
      leagueId,
      teamId,
      divisionId: divisionId ? (divisionId as Id<"divisions">) : undefined,
    });
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-oche-100">Divisions</h2>

      {divisions.length === 0 ? (
        <p className="mb-6 text-oche-400">
          No divisions yet. Create one below.
        </p>
      ) : (
        <ul className="mb-8 space-y-3">
          {divisions.map((division) => (
            <li
              key={division._id}
              className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-4 py-3"
            >
              {editingId === division._id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Edit division name"
                    className="rounded-md border border-oche-600 bg-oche-800 px-3 py-1 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={() =>
                      handleEdit(division._id as Id<"divisions">)
                    }
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
              ) : (
                <>
                  <span className="font-medium text-oche-100">
                    {division.name}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(division._id);
                        setEditName(division.name);
                      }}
                      className="rounded-md bg-oche-700 px-3 py-1 text-sm text-oche-200 transition hover:bg-oche-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(division._id as Id<"divisions">)
                      }
                      className="rounded-md bg-red-700/50 px-3 py-1 text-sm text-red-300 transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mb-10 max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-oche-200">
          Create Division
        </h3>

        <div>
          <label
            htmlFor="divisionName"
            className="block text-sm font-medium text-oche-300"
          >
            Division name
          </label>
          <input
            id="divisionName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. East…"
            className="mt-1 w-full rounded-md border border-oche-600 bg-oche-800 px-3 py-2 text-oche-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Division"}
        </button>
      </form>

      {teams.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-oche-200">
            Team Division Assignment
          </h3>
          <ul className="space-y-3">
            {teams.map((team) => (
              <li
                key={team._id}
                className="flex items-center justify-between rounded-lg border border-oche-700 bg-oche-800 px-4 py-3"
              >
                <span className="font-medium text-oche-100">{team.name}</span>
                <select
                  value={(team as any).divisionId ?? ""}
                  onChange={(e) =>
                    handleAssign(
                      team._id as Id<"teams">,
                      e.target.value,
                    )
                  }
                  aria-label={`Division for ${team.name}`}
                  className="rounded-md border border-oche-600 bg-oche-800 px-3 py-1 text-oche-100"
                >
                  <option value="">No division</option>
                  {divisions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
