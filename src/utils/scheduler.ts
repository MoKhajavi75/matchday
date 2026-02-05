import { generateUUID } from './helpers';
import type { MatchData } from '../types';

/**
 * Generates round-robin fixtures using the circle method for balanced scheduling.
 * This ensures NO player has consecutive matches in the same round.
 */
export function generateRoundRobinFixtures(
  playerIds: string[],
  competitionId: string
): MatchData[] {
  if (playerIds.length < 2) {
    throw new Error('At least 2 players are required');
  }

  const players = [...playerIds];
  const hasOddPlayers = players.length % 2 !== 0;

  if (hasOddPlayers) {
    players.push(null as any);
  }

  const numPlayers = players.length;
  const numRounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;
  const matches: MatchData[] = [];

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      let homeIndex: number, awayIndex: number;

      if (match === 0) {
        homeIndex = 0;
        awayIndex = numPlayers - 1;
      } else {
        homeIndex = match;
        awayIndex = numPlayers - 1 - match;
      }

      const homePlayer = players[homeIndex];
      const awayPlayer = players[awayIndex];

      if (homePlayer !== null && awayPlayer !== null) {
        matches.push(createMatch(competitionId, homePlayer, awayPlayer, round + 1));
      }
    }

    players.splice(1, 0, players.pop()!);
  }

  const returnMatches = matches.map(match =>
    createMatch(competitionId, match.awayPlayerId!, match.homePlayerId, match.round + numRounds)
  );

  return [...matches, ...returnMatches];
}

function createMatch(
  competitionId: string,
  homePlayerId: string,
  awayPlayerId: string,
  round: number
): MatchData {
  return {
    id: generateUUID(),
    competitionId,
    homePlayerId,
    awayPlayerId,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    round,
    bracketStage: null,
    bracketPosition: null,
    playedAt: null,
    nextMatchId: null,
    isBye: false
  };
}
