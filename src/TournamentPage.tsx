// ABOUTME: Tournament management page with create form, list, and bracket visualization.
// ABOUTME: Admins can create single-elimination tournaments; all members can view brackets.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { usePlan } from "./usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface TournamentPageProps {
  leagueId: Id<"leagues">;
}

interface BracketMatch {
  matchIndex: number;
  round: number;
  participant1Id: string | null;
  participant1Name: string | null;
  participant1Seed: number | null;
  participant2Id: string | null;
  participant2Name: string | null;
  participant2Seed: number | null;
  winnerId: string | null;
}

interface Tournament {
  _id: string;
  name: string;
  date: string;
  format: string;
  participantType: string;
  rounds: number;
  bracket: BracketMatch[];
  status: string;
}

export function TournamentPage({ leagueId }: TournamentPageProps) {
  const { isLoading, canUse } = usePlan();
  const tournaments = useQuery(api.tournaments.getTournaments, { leagueId }) as
    | Tournament[]
    | undefined;
  const teams = useQuery(api.teams.getTeams, { leagueId }) as
    | Array<{ _id: string; name: string }>
    | undefined;

  const createTournament = useMutation(api.tournaments.createTournament);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [participantType, setParticipantType] = useState<"player" | "team">("team");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingTournament, setViewingTournament] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleToggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }
    if (selectedIds.size < 2) {
      setError("Select at least 2 participants");
      return;
    }
    try {
      await createTournament({
        leagueId,
        name: name.trim(),
        date,
        format: "single-elimination",
        participantIds: Array.from(selectedIds),
        participantType,
      });
      setName("");
      setDate("");
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.message || "Failed to create tournament");
    }
  };

  if (isLoading) return null;
  if (!canUse("tournaments")) {
    return <UpgradePrompt feature="Tournaments" description="Create and manage single-elimination tournaments with seeded brackets." />;
  }

  const viewing = viewingTournament
    ? tournaments?.find((t) => t._id === viewingTournament)
    : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Tournaments</h2>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="bg-oche-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Create Tournament</h3>
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-oche-300 text-sm mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-oche-900 text-white rounded px-3 py-2"
              placeholder="Spring Playoffs…"
            />
          </div>
          <label className="block">
            <span className="block text-oche-300 text-sm mb-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-oche-900 text-white rounded px-3 py-2"
            />
          </label>
          <div>
            <label className="block text-oche-300 text-sm mb-1">
              Participant Type
            </label>
            <select
              value={participantType}
              onChange={(e) => setParticipantType(e.target.value as "player" | "team")}
              className="w-full bg-oche-900 text-white rounded px-3 py-2"
            >
              <option value="team">Teams</option>
              <option value="player">Players</option>
            </select>
          </div>

          {participantType === "team" && teams && (
            <div>
              <label className="block text-oche-300 text-sm mb-1">
                Select Teams
              </label>
              <div className="space-y-1">
                {teams.map((team) => (
                  <label
                    key={team._id}
                    className="flex items-center gap-2 text-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(team._id)}
                      onChange={() => handleToggleParticipant(team._id)}
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="bg-amber-500 text-black font-semibold rounded px-4 py-2 hover:bg-amber-400"
          >
            Create Tournament
          </button>
        </div>
      </form>

      {/* Tournament List */}
      {tournaments && tournaments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Existing Tournaments</h3>
          {tournaments.map((t) => (
            <div
              key={t._id}
              className="bg-oche-800 rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-oche-400 text-sm">
                  {t.date} · {t.format} · {t.status}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/leagues/${leagueId}/tournaments/${t._id}/score`}
                  className="text-amber-400 hover:text-amber-300 text-sm"
                >
                  Score
                </Link>
                <button
                  onClick={() =>
                    setViewingTournament(
                      viewingTournament === t._id ? null : t._id,
                    )
                  }
                  className="text-amber-400 hover:text-amber-300 text-sm"
                >
                  {viewingTournament === t._id ? "Hide Bracket" : "View Bracket"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tournaments && tournaments.length === 0 && (
        <p className="text-oche-400">No tournaments yet.</p>
      )}

      {/* Bracket Visualization */}
      {viewing && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            {viewing.name} — Bracket
          </h3>
          <BracketView bracket={viewing.bracket} rounds={viewing.rounds} />
        </div>
      )}
    </div>
  );
}

function BracketView({
  bracket,
  rounds,
}: {
  bracket: BracketMatch[];
  rounds: number;
}) {
  return (
    <div className="overflow-x-auto" data-testid="bracket-view">
      <div className="flex gap-8">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = bracket.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[200px]">
              <h4 className="text-oche-300 text-sm font-medium text-center">
                {round === rounds
                  ? "Final"
                  : round === rounds - 1
                    ? "Semifinal"
                    : `Round ${round}`}
              </h4>
              {roundMatches.map((m) => (
                <div
                  key={m.matchIndex}
                  className="bg-oche-900 rounded border border-oche-700 overflow-hidden"
                  data-testid={`bracket-match-${m.matchIndex}`}
                >
                  <div
                    className={`px-3 py-2 text-sm border-b border-oche-700 ${
                      m.winnerId === m.participant1Id && m.winnerId
                        ? "bg-amber-900/30 text-amber-300 font-semibold"
                        : "text-white"
                    }`}
                  >
                    {m.participant1Name
                      ? `${m.participant1Seed}. ${m.participant1Name}`
                      : "BYE"}
                  </div>
                  <div
                    className={`px-3 py-2 text-sm ${
                      m.winnerId === m.participant2Id && m.winnerId
                        ? "bg-amber-900/30 text-amber-300 font-semibold"
                        : "text-white"
                    }`}
                  >
                    {m.participant2Name
                      ? `${m.participant2Seed}. ${m.participant2Name}`
                      : "BYE"}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
