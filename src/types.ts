export type CompetitionType = 'league' | 'cup';
export type CompetitionStatus = 'setup' | 'in-progress' | 'completed';
export type MatchStatus = 'scheduled' | 'completed' | 'pending' | 'bye';
export type BracketStage = 'R64' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';

export interface PlayerStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface PlayerData {
  id: string;
  name: string;
  competitionId: string;
  stats: PlayerStats;
}

export interface MatchData {
  id: string;
  competitionId: string;
  homePlayerId: string;
  awayPlayerId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  round: number;
  bracketStage: BracketStage | null;
  bracketPosition: number | null;
  playedAt: string | null;
  nextMatchId: string | null;
  isBye: boolean;
}

export interface CompetitionSettings {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

export interface CompetitionData {
  id: string;
  name: string;
  type: CompetitionType;
  status: CompetitionStatus;
  players: string[];
  matches: string[];
  createdAt: string;
  completedAt: string | null;
  winner: string | null;
  settings: CompetitionSettings;
}

export interface RouteParams {
  [key: string]: string;
}

export type RouteHandler = (params: RouteParams) => void;
