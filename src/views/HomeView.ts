import { getCompetitions, getPlayers, deleteCompetition } from '../state';
import Competition from '../models/Competition';
import Modal from '../components/Modal';
import router from '../utils/router';

export default class HomeView {
  private container: HTMLElement;

  constructor() {
    const element = document.getElementById('main-content');
    if (!element) {
      throw new Error('Main content container not found');
    }
    this.container = element;
  }

  render(): void {
    const competitions = getCompetitions().map(c => Competition.fromData(c));

    const activeCompetitions = competitions.filter(c => c.status === 'in-progress');
    const completedCompetitions = competitions.filter(c => c.status === 'completed');

    this.container.innerHTML = `
      <div class="home-view">
        ${
          activeCompetitions.length > 0
            ? `
          <h2 class="mb-3">Active</h2>
          <div class="competition-grid">
            ${activeCompetitions.map(c => this.renderCompetitionCard(c)).join('')}
          </div>
        `
            : ''
        }

        ${
          completedCompetitions.length > 0
            ? `
          <h2 class="${activeCompetitions.length > 0 ? 'mt-4 ' : ''}mb-3">Completed</h2>
          <div class="competition-grid">
            ${completedCompetitions.map(c => this.renderCompetitionCard(c)).join('')}
          </div>
        `
            : ''
        }

        ${
          competitions.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-state-icon">⚽</div>
            <h3>No Competitions Yet</h3>
            <p>Hit <strong>+ New</strong> to create your first competition</p>
          </div>
        `
            : ''
        }
      </div>
    `;

    this.attachEventListeners();
  }

  private renderCompetitionCard(competition: Competition): string {
    const players = getPlayers(competition.id);
    const progress = competition.getProgress();
    const winner = competition.winner ? players.find(p => p.id === competition.winner) : null;

    const typeIcon = competition.type === 'league' ? '🏆' : '🏅';
    const statusBadge =
      competition.status === 'completed'
        ? '<span class="badge badge-success">Complete</span>'
        : '<span class="badge badge-warning">Active</span>';

    return `
      <div class="card competition-card" data-id="${competition.id}" data-type="${competition.type}">
        <div class="competition-card-header">
          <div>
            <div class="competition-type">${typeIcon} ${competition.type}</div>
            <h3 class="card-title">${competition.name}</h3>
          </div>
          ${statusBadge}
        </div>

        ${
          winner
            ? `<p>Winner: <strong>${winner.name}</strong></p>`
            : `
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <p class="text-secondary mt-1">${progress.completed} / ${progress.total} matches</p>
        `
        }

        <div class="competition-stats">
          <div class="competition-stat">
            <span class="competition-stat-value">${players.length}</span>
            <span class="competition-stat-label">Players</span>
          </div>
          <div class="competition-stat">
            <span class="competition-stat-value">${progress.total}</span>
            <span class="competition-stat-label">Matches</span>
          </div>
        </div>

        <div style="margin-top: 16px;">
          <button class="btn btn-sm btn-danger delete-btn" data-id="${competition.id}" onclick="event.stopPropagation()">Delete</button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    document.querySelectorAll('.competition-card').forEach(card => {
      card.addEventListener('click', e => {
        if (!(e.target as HTMLElement).classList.contains('delete-btn')) {
          const id = (card as HTMLElement).dataset.id;
          const type = (card as HTMLElement).dataset.type;
          if (id && type) {
            router.navigate(`/${type}/${id}`);
          }
        }
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;

        const competitionData = getCompetitions().find(c => c.id === id);
        if (!competitionData) return;

        const competition = Competition.fromData(competitionData);

        Modal.confirm(
          'Delete Competition',
          `Delete "${competition.name}"? This cannot be undone.`,
          () => {
            deleteCompetition(id);
            this.render();
          }
        );
      });
    });
  }
}
