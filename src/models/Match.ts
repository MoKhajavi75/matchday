import { generateUUID } from '../utils/helpers';
import { updateMatch, getPlayers, savePlayers } from '../state';
import Player from './Player';
import type { MatchData, CompetitionSettings } from '../types';

export default class Match {
  id: string;
  competitionId: string;
  homePlayerId: string;
  awayPlayerId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'completed' | 'pending' | 'bye';
  round: number;
  bracketStage: string | null;
  bracketPosition: number | null;
  playedAt: string | null;
  nextMatchId: string | null;
  isBye: boolean;

  constructor(data: MatchData) {
    this.id = data.id || generateUUID();
    this.competitionId = data.competitionId;
    this.homePlayerId = data.homePlayerId;
    this.awayPlayerId = data.awayPlayerId;
    this.homeScore = data.homeScore;
    this.awayScore = data.awayScore;
    this.status = data.status || 'scheduled';
    this.round = data.round;
    this.bracketStage = data.bracketStage || null;
    this.bracketPosition = data.bracketPosition || null;
    this.playedAt = data.playedAt || null;
    this.nextMatchId = data.nextMatchId || null;
    this.isBye = data.isBye || false;
  }

  static fromData(data: MatchData): Match {
    return new Match(data);
  }

  recordResult(homeScore: number, awayScore: number, pointsConfig: CompetitionSettings): boolean {
    if (homeScore < 0 || awayScore < 0) {
      throw new Error('Scores cannot be negative');
    }

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      throw new Error('Scores must be integers');
    }

    if (!this.awayPlayerId) {
      throw new Error('Cannot record result for bye match');
    }

    // Get ALL players (not just from this competition)
    const allPlayers = getPlayers();
    const homePlayerData = allPlayers.find(p => p.id === this.homePlayerId);
    const awayPlayerData = allPlayers.find(p => p.id === this.awayPlayerId);

    if (!homePlayerData || !awayPlayerData) {
      throw new Error('Players not found');
    }

    const homePlayer = Player.fromData(homePlayerData);
    const awayPlayer = Player.fromData(awayPlayerData);

    // If this is an edit (match already completed), revert old stats first
    if (this.status === 'completed' && this.homeScore !== null && this.awayScore !== null) {
      const oldHomeScore = this.homeScore;
      const oldAwayScore = this.awayScore;

      // Revert old stats
      if (oldHomeScore > oldAwayScore) {
        this.revertStats(homePlayer, 'won', oldHomeScore, oldAwayScore, pointsConfig);
        this.revertStats(awayPlayer, 'lost', oldAwayScore, oldHomeScore, pointsConfig);
      } else if (oldHomeScore < oldAwayScore) {
        this.revertStats(homePlayer, 'lost', oldHomeScore, oldAwayScore, pointsConfig);
        this.revertStats(awayPlayer, 'won', oldAwayScore, oldHomeScore, pointsConfig);
      } else {
        this.revertStats(homePlayer, 'drawn', oldHomeScore, oldAwayScore, pointsConfig);
        this.revertStats(awayPlayer, 'drawn', oldAwayScore, oldHomeScore, pointsConfig);
      }
    }

    // Set new scores
    this.homeScore = homeScore;
    this.awayScore = awayScore;
    this.status = 'completed';
    this.playedAt = new Date().toISOString();

    // Apply new stats
    if (homeScore > awayScore) {
      homePlayer.updateStats('won', homeScore, awayScore, pointsConfig);
      awayPlayer.updateStats('lost', awayScore, homeScore, pointsConfig);
    } else if (homeScore < awayScore) {
      homePlayer.updateStats('lost', homeScore, awayScore, pointsConfig);
      awayPlayer.updateStats('won', awayScore, homeScore, pointsConfig);
    } else {
      homePlayer.updateStats('drawn', homeScore, awayScore, pointsConfig);
      awayPlayer.updateStats('drawn', awayScore, homeScore, pointsConfig);
    }

    // Update ALL players, not just from this competition
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === homePlayer.id) return homePlayer.toJSON();
      if (p.id === awayPlayer.id) return awayPlayer.toJSON();
      return p;
    });

    savePlayers(updatedPlayers);

    return this.save();
  }

  private revertStats(
    player: Player,
    result: 'won' | 'drawn' | 'lost',
    goalsFor: number,
    goalsAgainst: number,
    pointsConfig: CompetitionSettings
  ): void {
    player.stats.played--;
    player.stats.goalsFor -= goalsFor;
    player.stats.goalsAgainst -= goalsAgainst;
    player.stats.goalDifference = player.stats.goalsFor - player.stats.goalsAgainst;

    if (result === 'won') {
      player.stats.won--;
      player.stats.points -= pointsConfig.pointsForWin;
    } else if (result === 'drawn') {
      player.stats.drawn--;
      player.stats.points -= pointsConfig.pointsForDraw;
    } else if (result === 'lost') {
      player.stats.lost--;
      player.stats.points -= pointsConfig.pointsForLoss;
    }
  }

  getWinnerId(): string | null {
    if (this.status !== 'completed') return null;
    if (this.homeScore === null || this.awayScore === null) return null;
    if (this.homeScore > this.awayScore) return this.homePlayerId;
    if (this.awayScore > this.homeScore) return this.awayPlayerId;
    return null;
  }

  getLoserId(): string | null {
    if (this.status !== 'completed') return null;
    if (this.homeScore === null || this.awayScore === null) return null;
    if (this.homeScore < this.awayScore) return this.homePlayerId;
    if (this.awayScore < this.homeScore) return this.awayPlayerId;
    return null;
  }

  reset(): boolean {
    this.homeScore = null;
    this.awayScore = null;
    this.status = this.isBye ? 'bye' : 'scheduled';
    this.playedAt = null;
    return this.save();
  }

  save(): boolean {
    return updateMatch(this.toJSON());
  }

  toJSON(): MatchData {
    return {
      id: this.id,
      competitionId: this.competitionId,
      homePlayerId: this.homePlayerId,
      awayPlayerId: this.awayPlayerId,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      status: this.status,
      round: this.round,
      bracketStage: this.bracketStage as any,
      bracketPosition: this.bracketPosition,
      playedAt: this.playedAt,
      nextMatchId: this.nextMatchId,
      isBye: this.isBye
    };
  }
}
