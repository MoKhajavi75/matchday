import type { MatchData, PlayerData } from '../types';

export default class Modal {
  private overlay: HTMLElement | null = null;
  private onClose: (() => void) | null = null;

  show(title: string, content: string, footer: string = ''): Modal {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return this;
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      if (this.onClose) {
        this.onClose();
      }
    }
  }

  static confirm(title: string, message: string, onConfirm: () => void): Modal {
    const modal = new Modal();
    const content = `<p>${message}</p>`;
    const footer = `
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm">Confirm</button>
    `;

    modal.show(title, content, footer);

    document.getElementById('modal-cancel')?.addEventListener('click', () => {
      modal.close();
    });

    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      modal.close();
      onConfirm();
    });

    return modal;
  }

  static alert(title: string, message: string): Modal {
    const modal = new Modal();
    const content = `<p>${message}</p>`;
    const footer = `<button class="btn btn-primary" id="modal-ok">OK</button>`;

    modal.show(title, content, footer);

    document.getElementById('modal-ok')?.addEventListener('click', () => {
      modal.close();
    });

    return modal;
  }

  static matchResult(
    match: MatchData,
    players: PlayerData[],
    onSave: (homeScore: number, awayScore: number) => void
  ): Modal {
    const modal = new Modal();
    const homePlayer = players.find(p => p.id === match.homePlayerId);
    const awayPlayer = match.awayPlayerId ? players.find(p => p.id === match.awayPlayerId) : null;

    if (!homePlayer || !awayPlayer) {
      Modal.alert('Error', 'Players not found for this match');
      return modal;
    }

    const content = `
      <form id="match-result-form">
        <div class="form-group">
          <label class="form-label">${homePlayer.name}</label>
          <input
            type="number"
            id="home-score"
            class="form-input"
            min="0"
            max="99"
            value="${match.homeScore !== null ? match.homeScore : ''}"
            required
            autofocus
          />
        </div>
        <div class="form-group">
          <label class="form-label">${awayPlayer.name}</label>
          <input
            type="number"
            id="away-score"
            class="form-input"
            min="0"
            max="99"
            value="${match.awayScore !== null ? match.awayScore : ''}"
            required
          />
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-success" id="modal-save">Save</button>
    `;

    modal.show('Match Result', content, footer);

    document.getElementById('modal-cancel')?.addEventListener('click', () => {
      modal.close();
    });

    const saveHandler = () => {
      const form = document.getElementById('match-result-form') as HTMLFormElement;
      if (form.checkValidity()) {
        const homeScoreInput = document.getElementById('home-score') as HTMLInputElement;
        const awayScoreInput = document.getElementById('away-score') as HTMLInputElement;

        const homeScore = parseInt(homeScoreInput.value, 10);
        const awayScore = parseInt(awayScoreInput.value, 10);

        if (homeScore >= 0 && awayScore >= 0 && homeScore <= 99 && awayScore <= 99) {
          modal.close();
          onSave(homeScore, awayScore);
        } else {
          Modal.alert('Invalid Input', 'Scores must be between 0 and 99');
        }
      } else {
        form.reportValidity();
      }
    };

    document.getElementById('modal-save')?.addEventListener('click', saveHandler);

    // Submit on Enter key
    document.getElementById('match-result-form')?.addEventListener('submit', e => {
      e.preventDefault();
      saveHandler();
    });

    return modal;
  }
}
