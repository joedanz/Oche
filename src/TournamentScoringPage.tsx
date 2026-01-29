// ABOUTME: Tournament bracket scoring page with winner selection and advancement.
// ABOUTME: Displays interactive bracket where admins select match winners; shows champion on completion.

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

interface TournamentScoringPageProps {
  leagueId: Id<"leagues">;
  tournamentId: Id<"tournaments">;
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
  rounds: number;
  bracket: BracketMatch[];
  status: string;
}

export function TournamentScoringPage({
  leagueId,
  tournamentId,
}: TournamentScoringPageProps) {
  const tournament = useQuery(api.tournaments.getTournamentDetail, {
    leagueId,
    tournamentId,
  }) as Tournament | undefined;

  const recordResult = useMutation(
    api.tournamentScoring.recordTournamentMatchResult,
  );

  if (!tournament) {
    return <p className="text-oche-400">Loading…</p>;
  }

  const champion = getChampion(tournament);

  const handleSelectWinner = async (matchIndex: number, winnerId: string) => {
    await recordResult({
      leagueId,
      tournamentId: tournamentId as any,
      matchIndex,
      winnerId,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">{tournament.name}</h2>

      {champion && (
        <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4 mb-6 text-center">
          <p className="text-amber-300 text-lg font-bold">🏆 Champion</p>
          <p className="text-white text-xl font-semibold">{champion}</p>
        </div>
      )}

      <div className="overflow-x-auto" data-testid="bracket-view">
        <div className="flex gap-8">
          {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(
            (round) => {
              const roundMatches = tournament.bracket.filter(
                (m) => m.round === round,
              );
              return (
                <div
                  key={round}
                  className="flex flex-col gap-4 min-w-[220px]"
                >
                  <h4 className="text-oche-300 text-sm font-medium text-center">
                    {round === tournament.rounds
                      ? "Final"
                      : round === tournament.rounds - 1
                        ? "Semifinal"
                        : `Round ${round}`}
                  </h4>
                  {roundMatches.map((m) => (
                    <BracketMatchCard
                      key={m.matchIndex}
                      match={m}
                      onSelectWinner={handleSelectWinner}
                    />
                  ))}
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  onSelectWinner,
}: {
  match: BracketMatch;
  onSelectWinner: (matchIndex: number, winnerId: string) => void;
}) {
  const canSelect =
    !match.winnerId &&
    match.participant1Id !== null &&
    match.participant2Id !== null;

  return (
    <div
      className="bg-oche-900 rounded border border-oche-700 overflow-hidden"
      data-testid={`bracket-match-${match.matchIndex}`}
    >
      <ParticipantRow
        participantId={match.participant1Id}
        name={match.participant1Name}
        seed={match.participant1Seed}
        isWinner={match.winnerId === match.participant1Id && match.winnerId !== null}
        canSelect={canSelect}
        onSelect={() =>
          match.participant1Id &&
          onSelectWinner(match.matchIndex, match.participant1Id)
        }
      />
      <ParticipantRow
        participantId={match.participant2Id}
        name={match.participant2Name}
        seed={match.participant2Seed}
        isWinner={match.winnerId === match.participant2Id && match.winnerId !== null}
        canSelect={canSelect}
        onSelect={() =>
          match.participant2Id &&
          onSelectWinner(match.matchIndex, match.participant2Id)
        }
        isBottom
      />
    </div>
  );
}

function ParticipantRow({
  participantId,
  name,
  seed,
  isWinner,
  canSelect,
  onSelect,
  isBottom,
}: {
  participantId: string | null;
  name: string | null;
  seed: number | null;
  isWinner: boolean;
  canSelect: boolean;
  onSelect: () => void;
  isBottom?: boolean;
}) {
  const label = name ? `${seed}. ${name}` : "BYE";

  return (
    <div
      className={`px-3 py-2 text-sm flex items-center justify-between ${
        !isBottom ? "border-b border-oche-700" : ""
      } ${
        isWinner
          ? "bg-amber-900/30 text-amber-300 font-semibold"
          : "text-white"
      }`}
      {...(isWinner ? { "data-winner": "true" } : {})}
    >
      <span>{label}</span>
      {canSelect && participantId && (
        <button
          onClick={onSelect}
          className="text-xs bg-oche-700 hover:bg-oche-600 text-oche-200 px-2 py-0.5 rounded"
          aria-label={`Select ${name} as winner`}
        >
          Select Winner
        </button>
      )}
    </div>
  );
}

function getChampion(tournament: Tournament): string | null {
  if (tournament.status !== "completed") return null;
  const finalMatch = tournament.bracket.find(
    (m) => m.round === tournament.rounds,
  );
  if (!finalMatch || !finalMatch.winnerId) return null;
  if (finalMatch.winnerId === finalMatch.participant1Id) {
    return finalMatch.participant1Name;
  }
  return finalMatch.participant2Name;
}
