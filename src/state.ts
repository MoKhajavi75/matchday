import type { CompetitionData, PlayerData, MatchData } from './types';

const STORAGE_PREFIX = 'matchday:';
const VERSION_KEY = `${STORAGE_PREFIX}version`;
const CURRENT_VERSION = __APP_VERSION__;

const KEYS = {
  competitions: `${STORAGE_PREFIX}competitions`,
  players: `${STORAGE_PREFIX}players`,
  matches: `${STORAGE_PREFIX}matches`
} as const;

type StorageKey = keyof typeof KEYS;

function checkLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

export function initializeStorage(): void {
  if (!checkLocalStorageAvailable()) {
    throw new Error('localStorage is not available in this browser');
  }

  const version = localStorage.getItem(VERSION_KEY);
  if (!version) {
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(KEYS.competitions, JSON.stringify([]));
    localStorage.setItem(KEYS.players, JSON.stringify([]));
    localStorage.setItem(KEYS.matches, JSON.stringify([]));
  }
}

function loadState<T>(key: StorageKey): T[] {
  try {
    const data = localStorage.getItem(KEYS[key]);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
    return [];
  }
}

function saveState<T>(key: StorageKey, data: T[]): boolean {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
    if ((e as Error).name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please delete some competitions.');
    }
    return false;
  }
}

export function clearState(): void {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  initializeStorage();
}

export function getCompetitions(): CompetitionData[] {
  return loadState<CompetitionData>('competitions');
}

export function getCompetition(id: string): CompetitionData | undefined {
  const competitions = getCompetitions();
  return competitions.find(c => c.id === id);
}

export function saveCompetition(competition: CompetitionData): boolean {
  const competitions = getCompetitions();
  const index = competitions.findIndex(c => c.id === competition.id);

  if (index >= 0) {
    competitions[index] = competition;
  } else {
    competitions.push(competition);
  }

  return saveState('competitions', competitions);
}

export function deleteCompetition(id: string): void {
  const competitions = getCompetitions().filter(c => c.id !== id);
  const players = getPlayers().filter(p => p.competitionId !== id);
  const matches = getMatches().filter(m => m.competitionId !== id);

  saveState('competitions', competitions);
  saveState('players', players);
  saveState('matches', matches);
}

export function getPlayers(competitionId: string | null = null): PlayerData[] {
  const players = loadState<PlayerData>('players');
  return competitionId ? players.filter(p => p.competitionId === competitionId) : players;
}

export function getPlayer(id: string): PlayerData | undefined {
  const players = getPlayers();
  return players.find(p => p.id === id);
}

export function savePlayers(playersList: PlayerData[]): boolean {
  return saveState('players', playersList);
}

export function updatePlayer(player: PlayerData): boolean {
  const players = getPlayers();
  const index = players.findIndex(p => p.id === player.id);

  if (index >= 0) {
    players[index] = player;
  } else {
    players.push(player);
  }

  return saveState('players', players);
}

export function getMatches(competitionId: string | null = null): MatchData[] {
  const matches = loadState<MatchData>('matches');
  return competitionId ? matches.filter(m => m.competitionId === competitionId) : matches;
}

export function getMatch(id: string): MatchData | undefined {
  const matches = getMatches();
  return matches.find(m => m.id === id);
}

export function saveMatches(matchesList: MatchData[]): boolean {
  return saveState('matches', matchesList);
}

export function updateMatch(match: MatchData): boolean {
  const matches = getMatches();
  const index = matches.findIndex(m => m.id === match.id);

  if (index >= 0) {
    matches[index] = match;
  } else {
    matches.push(match);
  }

  return saveState('matches', matches);
}
