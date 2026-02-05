import { generateUUID } from '../utils/helpers';
import { updatePlayer } from '../state';
import type { PlayerData, PlayerStats, CompetitionSettings } from '../types';

export default class Player {
  id: string;
  name: string;
  competitionId: string;
  stats: PlayerStats;

  constructor(name: string, competitionId: string, id: string | null = null) {
    this.id = id || generateUUID();
    this.name = name;
    this.competitionId = competitionId;
    this.stats = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    };
  }

  static fromData(data: PlayerData): Player {
    const player = new Player(data.name, data.competitionId, data.id);
    player.stats = { ...data.stats };
    return player;
  }

  updateStats(
    result: 'won' | 'drawn' | 'lost',
    goalsFor: number,
    goalsAgainst: number,
    pointsConfig: CompetitionSettings
  ): void {
    this.stats.played++;
    this.stats.goalsFor += goalsFor;
    this.stats.goalsAgainst += goalsAgainst;
    this.stats.goalDifference = this.stats.goalsFor - this.stats.goalsAgainst;

    if (result === 'won') {
      this.stats.won++;
      this.stats.points += pointsConfig.pointsForWin;
    } else if (result === 'drawn') {
      this.stats.drawn++;
      this.stats.points += pointsConfig.pointsForDraw;
    } else if (result === 'lost') {
      this.stats.lost++;
      this.stats.points += pointsConfig.pointsForLoss;
    }
  }

  resetStats(): void {
    this.stats = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    };
  }

  save(): boolean {
    return updatePlayer(this.toJSON());
  }

  toJSON(): PlayerData {
    return {
      id: this.id,
      name: this.name,
      competitionId: this.competitionId,
      stats: { ...this.stats }
    };
  }
}

export function sortPlayersByStanding(players: Player[]): Player[] {
  return players.sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }
    if (b.stats.goalDifference !== a.stats.goalDifference) {
      return b.stats.goalDifference - a.stats.goalDifference;
    }
    if (b.stats.goalsFor !== a.stats.goalsFor) {
      return b.stats.goalsFor - a.stats.goalsFor;
    }
    return a.name.localeCompare(b.name);
  });
}
