import Competition from '../models/Competition';
import Player, { sortPlayersByStanding } from '../models/Player';
import Match from '../models/Match';
import { getCompetition, getPlayers, getMatches } from '../state';
import Modal from '../components/Modal';
import router from '../utils/router';
import type { MatchData, PlayerData } from '../types';

export default class LeagueView {
  private competitionId: string;
  private container: HTMLElement;
  private competition: Competition | null = null;
  private players: Player[] = [];
  private matches: Match[] = [];

  constructor(competitionId: string) {
    this.competitionId = competitionId;
    const element = document.getElementById('main-content');
    if (!element) {
      throw new Error('Main content container not found');
    }
    this.container = element;
  }

  loadData(): boolean {
    const competitionData = getCompetition(this.competitionId);
    if (!competitionData) {
      router.navigate('/');
      return false;
    }

    this.competition = Competition.fromData(competitionData);
    this.players = getPlayers(this.competitionId).map(p => Player.fromData(p));
    this.matches = getMatches(this.competitionId).map(m => Match.fromData(m));

    return true;
  }

  render(): void {
    if (!this.loadData() || !this.competition) return;

    // Reload data to ensure we have latest
    this.players = getPlayers(this.competitionId).map(p => Player.fromData(p));
    this.matches = getMatches(this.competitionId).map(m => Match.fromData(m));

    const sortedPlayers = sortPlayersByStanding([...this.players]);
    const winner = this.competition.winner
      ? this.players.find(p => p.id === this.competition!.winner)
      : null;

    this.container.innerHTML = `
      <div class="league-view">
        ${winner ? this.renderWinnerBanner(winner) : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h1>${this.competition.name}</h1>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-secondary" id="reset-btn">Reset</button>
            <a href="#/" class="btn btn-outline">Home</a>
          </div>
        </div>

        ${this.renderStandings(sortedPlayers)}
        ${this.renderFixtures()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderWinnerBanner(winner: Player): string {
    return `
      <div class="winner-banner">
        <div class="winner-banner-icon">🏆</div>
        <div class="winner-banner-name">${winner.name}</div>
      </div>
    `;
  }

  private renderStandings(players: Player[]): string {
    return `
      <div class="standings-container">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="standings-position">Pos</th>
              <th>Player</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${players
              .map(
                (player, index) => `
              <tr class="standings-row-${index + 1}">
                <td class="standings-position">${index + 1}</td>
                <td><strong>${player.name}</strong></td>
                <td>${player.stats.played}</td>
                <td>${player.stats.won}</td>
                <td>${player.stats.drawn}</td>
                <td>${player.stats.lost}</td>
                <td>${player.stats.goalsFor}</td>
                <td>${player.stats.goalsAgainst}</td>
                <td>${player.stats.goalDifference > 0 ? '+' : ''}${player.stats.goalDifference}</td>
                <td><strong>${player.stats.points}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderFixtures(): string {
    const matchesByRound: { [key: number]: Match[] } = {};
    this.matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    const rounds = Object.keys(matchesByRound)
      .map(r => parseInt(r))
      .sort((a, b) => a - b);

    return `
      <div class="matches-container">
        <h2>Fixtures</h2>
        ${rounds
          .map(
            round => `
          <div class="round-group">
            <div class="round-header">Round ${round}</div>
            <div class="matches-list">
              ${matchesByRound[round].map(match => this.renderMatchCard(match)).join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderMatchCard(match: Match): string {
    const homePlayer = this.players.find(p => p.id === match.homePlayerId);
    const awayPlayer = match.awayPlayerId
      ? this.players.find(p => p.id === match.awayPlayerId)
      : null;

    if (!homePlayer || !awayPlayer) return '';

    const isCompleted = match.status === 'completed';

    return `
      <div class="match-card">
        <div class="match-players">
          <div class="match-player home">${homePlayer.name}</div>
          ${
            isCompleted
              ? `
            <div class="match-score">
              <span>${match.homeScore}</span>
              <span class="match-score-separator">-</span>
              <span>${match.awayScore}</span>
            </div>
          `
              : '<div class="match-status">vs</div>'
          }
          <div class="match-player away">${awayPlayer.name}</div>
        </div>
        <div class="match-actions">
          <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} result-btn" data-match-id="${match.id}">
            ${isCompleted ? 'Edit' : 'Add Result'}
          </button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    document.querySelectorAll('.result-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = (btn as HTMLElement).dataset.matchId;
        if (!matchId) return;

        const match = this.matches.find(m => m.id === matchId);
        if (match) {
          this.showMatchResultModal(match);
        }
      });
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn && this.competition) {
      resetBtn.addEventListener('click', () => {
        Modal.confirm(
          'Reset Competition',
          'Clear all match results? This cannot be undone.',
          () => {
            this.competition?.reset();
            this.render();
          }
        );
      });
    }
  }

  private showMatchResultModal(match: Match): void {
    if (!this.competition) return;

    const playersData: PlayerData[] = this.players.map(p => p.toJSON());
    const matchData: MatchData = match.toJSON();

    Modal.matchResult(matchData, playersData, (homeScore, awayScore) => {
      const matchObj = Match.fromData(matchData);
      matchObj.recordResult(homeScore, awayScore, this.competition!.settings);
      this.competition!.checkCompletion();
      this.render();
    });
  }
}
