import { generateUUID, nextPowerOf2, shuffleArray } from './helpers';
import type { MatchData, BracketStage } from '../types';

/**
 * Generates knockout bracket with support for any number of players.
 * BYE players are advanced through the bracket until they meet a real opponent.
 * Matches waiting for a real game result are marked 'pending' (TBD).
 */
export function generateKnockoutBracket(playerIds: string[], competitionId: string): MatchData[] {
  if (playerIds.length < 2) {
    throw new Error('At least 2 players are required');
  }

  const numPlayers = playerIds.length;
  const totalSlots = nextPowerOf2(numPlayers);
  const numRounds = Math.log2(totalSlots);

  const shuffledPlayers = shuffleArray(playerIds);
  const stageNames = getBracketStageNames(numRounds);

  // roundMatches[round] is an array of matches, indexed by bracketPosition.
  // Every position is present (some may be null to represent empty slots).
  const roundMatches: (MatchData | null)[][] = [];
  for (let r = 0; r < numRounds; r++) {
    roundMatches.push([]);
  }

  // --- Round 1: create ALL slots, including empty ones ---
  const firstRoundMatchCount = totalSlots / 2;
  for (let i = 0; i < firstRoundMatchCount; i++) {
    const p1 = i * 2 < shuffledPlayers.length ? shuffledPlayers[i * 2] : null;
    const p2 = i * 2 + 1 < shuffledPlayers.length ? shuffledPlayers[i * 2 + 1] : null;

    if (!p1 && !p2) {
      // Empty slot — no match here at all
      roundMatches[0].push(null);
    } else if (p1 && p2) {
      roundMatches[0].push({
        id: generateUUID(),
        competitionId,
        homePlayerId: p1,
        awayPlayerId: p2,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        round: 1,
        bracketStage: stageNames[0],
        bracketPosition: i,
        playedAt: null,
        nextMatchId: null,
        isBye: false
      });
    } else {
      // One player, one empty — BYE
      const player = p1 || p2!;
      roundMatches[0].push({
        id: generateUUID(),
        competitionId,
        homePlayerId: player,
        awayPlayerId: null,
        homeScore: null,
        awayScore: null,
        status: 'bye',
        round: 1,
        bracketStage: stageNames[0],
        bracketPosition: i,
        playedAt: null,
        nextMatchId: null,
        isBye: true
      });
    }
  }

  // --- Subsequent rounds: create all match slots ---
  for (let r = 1; r < numRounds; r++) {
    const matchCount = totalSlots / Math.pow(2, r + 1);
    for (let i = 0; i < matchCount; i++) {
      roundMatches[r].push({
        id: generateUUID(),
        competitionId,
        homePlayerId: null as any,
        awayPlayerId: null,
        homeScore: null,
        awayScore: null,
        status: 'pending',
        round: r + 1,
        bracketStage: stageNames[r],
        bracketPosition: i,
        playedAt: null,
        nextMatchId: null,
        isBye: false
      });
    }
  }

  // --- Link matches: each match at position i feeds into position floor(i/2) in the next round ---
  for (let r = 0; r < numRounds - 1; r++) {
    for (let i = 0; i < roundMatches[r].length; i++) {
      const match = roundMatches[r][i];
      if (!match) continue;
      const nextPos = Math.floor(i / 2);
      const nextMatch = roundMatches[r + 1][nextPos];
      if (nextMatch) {
        match.nextMatchId = nextMatch.id;
      }
    }
  }

  // --- Remove empty matches (both feeders have no players) ---
  // Then advance BYE players through the bracket.
  removeEmptyMatches(roundMatches, numRounds);
  advanceByePlayers(roundMatches, numRounds);

  // --- Flatten, skipping null slots ---
  const result: MatchData[] = [];
  for (let r = 0; r < numRounds; r++) {
    for (const m of roundMatches[r]) {
      if (m) result.push(m);
    }
  }
  return result;
}

/**
 * Returns true if the feeder tree rooted at round `r`, position `pos`
 * contains at least one real (non-bye) match that will produce a winner.
 */
function hasRealMatchInTree(roundMatches: (MatchData | null)[][], r: number, pos: number): boolean {
  if (r < 0) return false;

  const match = roundMatches[r][pos];

  // No match at this slot — nothing feeds from here
  if (!match) return false;

  // A scheduled match IS a real match
  if (match.status === 'scheduled') return true;

  // A pending match has real matches somewhere below it
  // (otherwise it wouldn't exist or would have become a BYE)
  if (match.status === 'pending' && !match.isBye) return true;

  // For a BYE match, check its children (there shouldn't be real matches
  // under a BYE, but be safe)
  if (r === 0) return false;

  const child1Pos = pos * 2;
  const child2Pos = pos * 2 + 1;
  return (
    hasRealMatchInTree(roundMatches, r - 1, child1Pos) ||
    hasRealMatchInTree(roundMatches, r - 1, child2Pos)
  );
}

/**
 * Nullifies matches in rounds 2+ where NEITHER feeder sub-tree contains
 * any player at all. These are structurally dead slots that will never
 * produce a participant.
 */
function removeEmptyMatches(roundMatches: (MatchData | null)[][], numRounds: number): void {
  for (let r = 1; r < numRounds; r++) {
    for (let i = 0; i < roundMatches[r].length; i++) {
      const match = roundMatches[r][i];
      if (!match) continue;

      // Check both feeder positions in the previous round
      const feeder1Pos = i * 2;
      const feeder2Pos = i * 2 + 1;
      const feeder1HasPlayers = hasAnyPlayerInTree(roundMatches, r - 1, feeder1Pos);
      const feeder2HasPlayers = hasAnyPlayerInTree(roundMatches, r - 1, feeder2Pos);

      if (!feeder1HasPlayers && !feeder2HasPlayers) {
        // Nobody will ever reach this match — remove it
        roundMatches[r][i] = null;
      }
    }
  }
}

/**
 * Returns true if the sub-tree at round r, position pos contains any player.
 */
function hasAnyPlayerInTree(roundMatches: (MatchData | null)[][], r: number, pos: number): boolean {
  if (r < 0 || pos >= roundMatches[r].length) return false;

  const match = roundMatches[r][pos];
  if (!match) return false;
  if (match.homePlayerId || match.awayPlayerId) return true;

  if (r === 0) return false;

  return (
    hasAnyPlayerInTree(roundMatches, r - 1, pos * 2) ||
    hasAnyPlayerInTree(roundMatches, r - 1, pos * 2 + 1)
  );
}

/**
 * Advance BYE players through the bracket.
 * A BYE player advances to the next round's slot. The next round match becomes:
 * - 'scheduled' if both feeder slots provide a player
 * - 'bye' if the OTHER feeder has no real match in its entire sub-tree
 * - 'pending' otherwise (waiting for a real match to produce a winner)
 */
function advanceByePlayers(roundMatches: (MatchData | null)[][], numRounds: number): void {
  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < numRounds - 1; r++) {
      for (let i = 0; i < roundMatches[r].length; i++) {
        const match = roundMatches[r][i];
        if (!match || !match.isBye || !match.homePlayerId) continue;

        const nextPos = Math.floor(i / 2);
        const nextMatch = roundMatches[r + 1][nextPos];
        if (!nextMatch) continue;

        // Which slot does this match feed into? Even index → home, odd → away
        const isHome = i % 2 === 0;

        // Check if the player is already placed
        const alreadyPlaced = isHome
          ? nextMatch.homePlayerId === match.homePlayerId
          : nextMatch.awayPlayerId === match.homePlayerId;
        if (alreadyPlaced) continue;

        // Check the slot is empty
        const slotEmpty = isHome ? !nextMatch.homePlayerId : !nextMatch.awayPlayerId;
        if (!slotEmpty) continue;

        // Place the player
        if (isHome) {
          nextMatch.homePlayerId = match.homePlayerId;
        } else {
          nextMatch.awayPlayerId = match.homePlayerId;
        }

        // Now determine the status of nextMatch.
        // Check whether the OTHER feeder position has any real match in its tree.
        const otherPos = isHome ? i + 1 : i - 1;
        const otherFeedHasRealMatch = hasRealMatchInTree(roundMatches, r, otherPos);

        if (nextMatch.homePlayerId && nextMatch.awayPlayerId) {
          // Both slots filled
          nextMatch.status = 'scheduled';
        } else if (!otherFeedHasRealMatch) {
          // The other side will NEVER produce a player → BYE
          // Normalize: always put the player in homePlayerId
          if (!nextMatch.homePlayerId && nextMatch.awayPlayerId) {
            nextMatch.homePlayerId = nextMatch.awayPlayerId;
            nextMatch.awayPlayerId = null;
          }
          nextMatch.status = 'bye';
          nextMatch.isBye = true;
          changed = true;
        } else {
          // The other side has a real match that will eventually produce a player → pending
          nextMatch.status = 'pending';
        }
      }
    }
  }
}

function getBracketStageNames(numRounds: number): BracketStage[] {
  const stages: BracketStage[] = ['R64', 'R32', 'R16', 'QF', 'SF', 'F'];
  return stages.slice(-numRounds);
}

export function getBracketRounds(matches: MatchData[]): Record<string, MatchData[]> {
  const rounds: Record<string, MatchData[]> = {};
  matches.forEach(match => {
    if (match.bracketStage) {
      if (!rounds[match.bracketStage]) {
        rounds[match.bracketStage] = [];
      }
      rounds[match.bracketStage].push(match);
    }
  });

  const stageOrder: BracketStage[] = ['R64', 'R32', 'R16', 'QF', 'SF', 'F'];
  const sortedRounds: Record<string, MatchData[]> = {};

  stageOrder.forEach(stage => {
    if (rounds[stage]) {
      sortedRounds[stage] = rounds[stage].sort(
        (a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0)
      );
    }
  });

  return sortedRounds;
}

export function getFullStageName(stage: string): string {
  const names: Record<string, string> = {
    R64: 'Round of 64',
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter Finals',
    SF: 'Semi Finals',
    F: 'Final'
  };
  return names[stage] || stage;
}
