import Modal from '../components/Modal';
import { CupCompetition, LeagueCompetition } from '../models/Competition';
import type { CompetitionType } from '../types';
import router from '../utils/router';

export default class CreateView {
  private container: HTMLElement;
  private step: number = 1;
  private competitionType: CompetitionType | null = null;
  private competitionName: string = '';
  private players: string[] = [];

  constructor() {
    const element = document.getElementById('main-content');
    if (!element) {
      throw new Error('Main content container not found');
    }
    this.container = element;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="create-view">
        <h1>Create Competition</h1>
        <div id="step-content"></div>
      </div>
    `;

    this.renderStep();
  }

  private renderStep(): void {
    const stepContent = document.getElementById('step-content');
    if (!stepContent) return;

    switch (this.step) {
      case 1:
        stepContent.innerHTML = this.renderTypeSelection();
        break;
      case 2:
        stepContent.innerHTML = this.renderNameInput();
        break;
      case 3:
        stepContent.innerHTML = this.renderPlayerInput();
        break;
      case 4:
        stepContent.innerHTML = this.renderPreview();
        break;
    }

    this.attachStepListeners();
  }

  private renderTypeSelection(): string {
    return `
      <div class="card" style="max-width: 800px;">
        <h2>Select Type</h2>

        <div style="display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); margin-top: 24px;">
          <div class="type-card ${this.competitionType === 'league' ? 'selected' : ''}" id="type-league">
            <h3>🏆 League</h3>
            <p>Round-robin: everyone plays everyone</p>
          </div>

          <div class="type-card ${this.competitionType === 'cup' ? 'selected' : ''}" id="type-cup">
            <h3>🏅 Cup</h3>
            <p>Knockout: single elimination bracket</p>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <a href="#/" class="btn btn-secondary">Cancel</a>
          <button class="btn btn-primary" id="next-btn" ${!this.competitionType ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;
  }

  private renderNameInput(): string {
    return `
      <div class="card" style="max-width: 600px;">
        <h2>Name</h2>

        <div class="form-group" style="margin-top: 24px;">
          <input
            type="text"
            id="competition-name"
            class="form-input"
            placeholder="Competition name"
            value="${this.competitionName}"
            maxlength="50"
            autofocus
          />
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="back-btn">Back</button>
          <button class="btn btn-primary" id="next-btn">Next</button>
        </div>
      </div>
    `;
  }

  private renderPlayerInput(): string {
    return `
      <div class="card" style="max-width: 600px;">
        <h2>Add Players (min 2)</h2>

        <div class="form-group" style="margin-top: 24px;">
          <div style="display: flex; gap: 12px;">
            <input
              type="text"
              id="player-name"
              class="form-input"
              placeholder="Player name"
              maxlength="30"
              autofocus
            />
            <button class="btn btn-primary" id="add-player-btn">Add</button>
          </div>
        </div>

        <div id="players-list" style="margin-top: 24px;">
          ${
            this.players.length > 0
              ? `
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${this.players
                .map(
                  (player, index) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--background); border-radius: var(--radius-sm);">
                  <span>${player}</span>
                  <button class="btn btn-sm btn-danger remove-player-btn" data-index="${index}" style="padding: 4px 8px;">×</button>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : '<p class="text-secondary">No players added</p>'
          }
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="back-btn">Back</button>
          <button class="btn btn-primary" id="next-btn" ${this.players.length < 2 ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;
  }

  private renderPreview(): string {
    const totalMatches =
      this.competitionType === 'league'
        ? this.players.length * (this.players.length - 1)
        : this.players.length - 1;

    return `
      <div class="card" style="max-width: 600px;">
        <h2>Confirm</h2>

        <div style="background: var(--background); padding: 16px; border-radius: var(--radius); margin: 24px 0;">
          <div style="margin-bottom: 12px;">
            <strong>Type:</strong> ${this.competitionType === 'league' ? '🏆 League' : '🏅 Cup'}
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Name:</strong> ${this.competitionName}
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Players:</strong> ${this.players.length}
          </div>
          <div>
            <strong>Matches:</strong> ${totalMatches}
          </div>
        </div>

        <div>
          <strong>Players:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
            ${this.players
              .map(
                player =>
                  `<span style="padding: 4px 12px; background: var(--primary); color: white; border-radius: 12px; font-size: 0.875rem;">${player}</span>`
              )
              .join('')}
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="back-btn">Back</button>
          <button class="btn btn-success btn-lg" id="create-btn">Create</button>
        </div>
      </div>
    `;
  }

  private attachStepListeners(): void {
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const createBtn = document.getElementById('create-btn');

    nextBtn?.addEventListener('click', () => this.handleNext());
    backBtn?.addEventListener('click', () => this.handleBack());
    createBtn?.addEventListener('click', () => this.handleCreate());

    // Step 1: Type selection
    const leagueCard = document.getElementById('type-league');
    const cupCard = document.getElementById('type-cup');

    leagueCard?.addEventListener('click', () => {
      this.competitionType = 'league';
      this.renderStep();
    });

    cupCard?.addEventListener('click', () => {
      this.competitionType = 'cup';
      this.renderStep();
    });

    // Step 2: Name input
    const nameInput = document.getElementById('competition-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', e => {
        this.competitionName = (e.target as HTMLInputElement).value.trim();
      });

      nameInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.handleNext();
        }
      });
    }

    // Step 3: Player input
    const playerInput = document.getElementById('player-name') as HTMLInputElement;
    const addPlayerBtn = document.getElementById('add-player-btn');

    if (playerInput && addPlayerBtn) {
      const addPlayer = () => {
        const name = playerInput.value.trim();
        if (name) {
          if (this.players.includes(name)) {
            Modal.alert('Duplicate', 'Player already exists');
            return;
          }
          this.players.push(name);
          playerInput.value = '';
          this.renderStep();

          // Refocus the input after re-render
          setTimeout(() => {
            const newInput = document.getElementById('player-name') as HTMLInputElement;
            if (newInput) {
              newInput.focus();
            }
          }, 0);
        }
      };

      addPlayerBtn.addEventListener('click', addPlayer);
      playerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addPlayer();
        }
      });
    }

    // Remove player buttons
    document.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.players.splice(index, 1);
        this.renderStep();
      });
    });
  }

  private handleNext(): void {
    if (this.step === 2 && !this.competitionName.trim()) {
      Modal.alert('Required', 'Enter a competition name');
      return;
    }

    this.step++;
    this.renderStep();
  }

  private handleBack(): void {
    this.step--;
    this.renderStep();
  }

  private handleCreate(): void {
    try {
      const competition =
        this.competitionType === 'league'
          ? new LeagueCompetition(this.competitionName)
          : new CupCompetition(this.competitionName);

      this.players.forEach(playerName => {
        competition.addPlayer(playerName);
      });

      competition.generateFixtures();

      router.navigate(`/${competition.type}/${competition.id}`);
    } catch (error) {
      Modal.alert('Error', (error as Error).message);
    }
  }
}
