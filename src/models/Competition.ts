import { generateUUID } from '../utils/helpers';
import { saveCompetition, getPlayers, savePlayers, getMatches, saveMatches } from '../state';
import Player from './Player';
import Match from './Match';
import { generateRoundRobinFixtures } from '../utils/scheduler';
import { generateKnockoutBracket } from '../utils/bracketGenerator';
import type { CompetitionData, CompetitionType, CompetitionSettings } from '../types';

export default class Competition {
  id: string;
  name: string;
  type: CompetitionType;
  status: 'setup' | 'in-progress' | 'completed';
  players: string[];
  matches: string[];
  createdAt: string;
  completedAt: string | null;
  winner: string | null;
  settings: CompetitionSettings;

  constructor(name: string, type: CompetitionType, id: string | null = null) {
    this.id = id || generateUUID();
    this.name = name;
    this.type = type;
    this.status = 'setup';
    this.players = [];
    this.matches = [];
    this.createdAt = new Date().toISOString();
    this.completedAt = null;
    this.winner = null;
    this.settings = {
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0
    };
  }

  static fromData(data: CompetitionData): Competition {
    const competition = new Competition(data.name, data.type, data.id);
    competition.status = data.status;
    competition.players = data.players;
    competition.matches = data.matches;
    competition.createdAt = data.createdAt;
    competition.completedAt = data.completedAt;
    competition.winner = data.winner;
    competition.settings = { ...data.settings };
    return competition;
  }

  addPlayer(name: string): Player {
    const player = new Player(name, this.id);
    player.save();
    this.players.push(player.id);
    return player;
  }

  generateFixtures(): boolean {
    if (this.players.length < 2) {
      throw new Error('At least 2 players are required');
    }

    let matches;
    if (this.type === 'league') {
      matches = generateRoundRobinFixtures(this.players, this.id);
    } else if (this.type === 'cup') {
      matches = generateKnockoutBracket(this.players, this.id);
    } else {
      throw new Error('Invalid competition type');
    }

    const allMatches = getMatches();
    const newMatches = [...allMatches, ...matches];
    saveMatches(newMatches);

    this.matches = matches.map(m => m.id);
    this.status = 'in-progress';

    return this.save();
  }

  checkCompletion(): void {
    const matches = getMatches(this.id).map(m => Match.fromData(m));

    if (this.type === 'league') {
      const allComplete = matches.every(m => m.status === 'completed');
      if (allComplete) {
        this.status = 'completed';
        this.completedAt = new Date().toISOString();
        this.winner = this.determineLeagueWinner();
        this.save();
      }
    } else if (this.type === 'cup') {
      const finalMatch = matches.find(m => m.bracketStage === 'F');
      if (finalMatch && finalMatch.status === 'completed') {
        this.status = 'completed';
        this.completedAt = new Date().toISOString();
        this.winner = finalMatch.getWinnerId();
        this.save();
      }
    }
  }

  determineLeagueWinner(): string | null {
    const players = getPlayers(this.id).map(p => Player.fromData(p));
    const sorted = players.sort((a, b) => {
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

    return sorted.length > 0 ? sorted[0].id : null;
  }

  reset(): boolean {
    // For cup competitions, regenerate the bracket to restore initial state
    if (this.type === 'cup') {
      // Remove old matches
      const allMatches = getMatches();
      const otherMatches = allMatches.filter(m => m.competitionId !== this.id);

      // Generate new bracket
      const newMatches = generateKnockoutBracket(this.players, this.id);
      saveMatches([...otherMatches, ...newMatches]);

      this.matches = newMatches.map(m => m.id);
    } else {
      // For league, just reset scores
      const matches = getMatches(this.id).map(m => Match.fromData(m));
      matches.forEach(match => match.reset());
      const updatedMatches = getMatches().map(m => {
        const match = matches.find(updated => updated.id === m.id);
        return match ? match.toJSON() : m;
      });
      saveMatches(updatedMatches);
    }

    // Reset player stats
    const players = getPlayers(this.id).map(p => Player.fromData(p));
    players.forEach(player => player.resetStats());
    const updatedPlayers = getPlayers().map(p => {
      const player = players.find(updated => updated.id === p.id);
      return player ? player.toJSON() : p;
    });
    savePlayers(updatedPlayers);

    this.status = 'in-progress';
    this.completedAt = null;
    this.winner = null;

    return this.save();
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const matches = getMatches(this.id);
    const completed = matches.filter(m => m.status === 'completed').length;
    const total = matches.filter(m => !m.isBye).length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0
    };
  }

  save(): boolean {
    return saveCompetition(this.toJSON());
  }

  toJSON(): CompetitionData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      players: this.players,
      matches: this.matches,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      winner: this.winner,
      settings: { ...this.settings }
    };
  }
}

export class LeagueCompetition extends Competition {
  constructor(name: string, id: string | null = null) {
    super(name, 'league', id);
  }
}

export class CupCompetition extends Competition {
  constructor(name: string, id: string | null = null) {
    super(name, 'cup', id);
  }
}
