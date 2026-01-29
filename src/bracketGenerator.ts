// ABOUTME: Pure functions for generating single-elimination tournament brackets.
// ABOUTME: Handles seeding, byes, and bracket structure for any number of participants.

export interface BracketParticipant {
  id: string;
  name: string;
  seed: number;
}

export interface BracketMatch {
  matchIndex: number;
  round: number;
  participant1: BracketParticipant | null;
  participant2: BracketParticipant | null;
  winnerId: string | null;
}

export interface Bracket {
  rounds: number;
  matches: BracketMatch[];
}

export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Generate seeded first-round matchups.
 * Places seeds so that #1 vs #N, #2 vs #(N-1), etc.
 * When there are byes, highest seeds get the byes.
 */
export function generateBracket(participants: BracketParticipant[]): Bracket {
  if (participants.length < 2) {
    throw new Error("Need at least 2 participants");
  }

  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const bracketSize = nextPowerOf2(sorted.length);
  const rounds = Math.log2(bracketSize);
  const numFirstRoundMatches = bracketSize / 2;
  // Build seeded positions using standard bracket seeding
  const positions = buildSeededPositions(bracketSize);

  // Place participants and byes into first round
  const firstRoundMatches: BracketMatch[] = [];
  for (let i = 0; i < numFirstRoundMatches; i++) {
    const pos1 = positions[i * 2];
    const pos2 = positions[i * 2 + 1];
    const p1 = pos1 <= sorted.length ? sorted[pos1 - 1] : null;
    const p2 = pos2 <= sorted.length ? sorted[pos2 - 1] : null;

    // If one side is a bye, the other auto-advances (winner set immediately)
    let winnerId: string | null = null;
    if (p1 && !p2) winnerId = p1.id;
    if (!p1 && p2) winnerId = p2.id;

    firstRoundMatches.push({
      matchIndex: i,
      round: 1,
      participant1: p1,
      participant2: p2,
      winnerId,
    });
  }

  // Build all subsequent round matches (empty, to be filled as winners advance)
  const allMatches = [...firstRoundMatches];
  let matchCounter = firstRoundMatches.length;
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      allMatches.push({
        matchIndex: matchCounter++,
        round,
        participant1: null,
        participant2: null,
        winnerId: null,
      });
    }
  }

  return { rounds, matches: allMatches };
}

/**
 * Standard bracket seeding positions.
 * For size 8: [1,8,4,5,2,7,3,6] — ensures #1 meets #8, #4 meets #5, etc.
 */
function buildSeededPositions(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const positions: number[] = [1, 2];
  while (positions.length < size) {
    const nextRound: number[] = [];
    const currentMax = positions.length * 2 + 1;
    for (const seed of positions) {
      nextRound.push(seed);
      nextRound.push(currentMax - seed);
    }
    positions.length = 0;
    positions.push(...nextRound);
  }
  return positions;
}
