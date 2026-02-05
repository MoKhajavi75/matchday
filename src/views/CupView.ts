import Competition from '../models/Competition';
import Player from '../models/Player';
import Match from '../models/Match';
import { getCompetition, getPlayers, getMatches, saveMatches } from '../state';
import { getBracketRounds, getFullStageName } from '../utils/bracketGenerator';
import Modal from '../components/Modal';
import router from '../utils/router';
import type { MatchData, PlayerData } from '../types';

export default class CupView {
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

    const winner = this.competition.winner
      ? this.players.find(p => p.id === this.competition!.winner)
      : null;

    this.container.innerHTML = `
      <div class="cup-view">
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

        ${this.renderBracket()}
      </div>
    `;

    this.drawConnectors();
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

  private renderBracket(): string {
    const matchesData = this.matches.map(m => m.toJSON());
    const rounds = getBracketRounds(matchesData);
    const roundEntries = Object.entries(rounds);

    // The number of first-round slots determines the grid row count.
    // This is always 2^(numRounds-1), giving every round a consistent grid.
    const numRounds = roundEntries.length;
    const gridRows = Math.pow(2, numRounds - 1);
    const gridStyle = `grid-template-rows: repeat(${gridRows}, minmax(120px, 1fr))`;

    let html = '<div class="bracket-container"><div class="bracket">';

    roundEntries.forEach(([stage, matches], roundIdx) => {
      // How many grid rows each match spans in this round
      const slotSpan = Math.pow(2, roundIdx);

      // Match column
      html += `<div class="bracket-round-col">`;
      html += `<div class="bracket-round-title">${getFullStageName(stage)}</div>`;
      html += `<div class="bracket-matches-col" data-round="${roundIdx}" style="${gridStyle}">`;

      matches.forEach(match => {
        const pos = match.bracketPosition ?? 0;
        const rowStart = pos * slotSpan + 1; // CSS grid is 1-indexed
        const wrapperStyle = `grid-row: ${rowStart} / span ${slotSpan}`;
        html += `<div class="bracket-match-wrapper" style="${wrapperStyle}">`;
        html += this.renderBracketMatch(match);
        html += `</div>`;
      });

      html += `</div></div>`;

      // Connector column (between rounds, not after the last)
      if (roundIdx < roundEntries.length - 1) {
        html += `<div class="bracket-connector-col" data-connector="${roundIdx}"></div>`;
      }
    });

    html += '</div></div>';
    return html;
  }

  private renderBracketMatch(matchData: MatchData): string {
    const homePlayer = matchData.homePlayerId
      ? this.players.find(p => p.id === matchData.homePlayerId)
      : null;
    const awayPlayer = matchData.awayPlayerId
      ? this.players.find(p => p.id === matchData.awayPlayerId)
      : null;

    const match = Match.fromData(matchData);
    const isCompleted = match.status === 'completed';
    const isBye = match.status === 'bye';
    const isPending = match.status === 'pending';
    const isScheduled = match.status === 'scheduled';

    const winnerId = isCompleted ? match.getWinnerId() : null;
    const loserId = isCompleted ? match.getLoserId() : null;

    let matchClass = 'bracket-match';
    if (isCompleted) matchClass += ' completed';
    if (isBye) matchClass += ' bye-match';
    if (isPending) matchClass += ' pending-match';

    return `
      <div class="${matchClass}" data-match-id="${match.id}">
        ${
          isBye
            ? `
          <div class="bracket-player winner">
            <span class="bracket-player-name">${homePlayer ? homePlayer.name : 'TBD'}</span>
            <span class="bracket-player-score bracket-bye">BYE</span>
          </div>
          <div class="bracket-player">
            <span class="bracket-player-name" style="color: var(--text-secondary)">-</span>
            <span class="bracket-player-score" style="color: var(--text-secondary)">-</span>
          </div>
        `
            : isPending
              ? `
          <div class="bracket-player">
            <span class="bracket-player-name">${homePlayer ? homePlayer.name : '<span class="bracket-tbd">TBD</span>'}</span>
            <span class="bracket-player-score" style="color: var(--text-secondary)">-</span>
          </div>
          <div class="bracket-player">
            <span class="bracket-player-name">${awayPlayer ? awayPlayer.name : '<span class="bracket-tbd">TBD</span>'}</span>
            <span class="bracket-player-score" style="color: var(--text-secondary)">-</span>
          </div>
        `
              : `
          <div class="bracket-player ${winnerId === match.homePlayerId ? 'winner' : loserId === match.homePlayerId ? 'loser' : ''}">
            <span class="bracket-player-name">${homePlayer ? homePlayer.name : '<span class="bracket-tbd">TBD</span>'}</span>
            <span class="bracket-player-score">${match.homeScore !== null ? match.homeScore : '-'}</span>
          </div>
          <div class="bracket-player ${winnerId === match.awayPlayerId ? 'winner' : loserId === match.awayPlayerId ? 'loser' : ''}">
            <span class="bracket-player-name">${awayPlayer ? awayPlayer.name : '<span class="bracket-tbd">TBD</span>'}</span>
            <span class="bracket-player-score">${match.awayScore !== null ? match.awayScore : '-'}</span>
          </div>
        `
        }
        ${
          isScheduled || isCompleted
            ? `
          <div style="padding: 6px 8px; text-align: center; border-top: 1px solid var(--border);">
            <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} result-btn" data-match-id="${match.id}" style="width: 100%; font-size: 0.8rem;">
              ${isCompleted ? 'Edit' : 'Add Result'}
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  private drawConnectors(): void {
    const bracket = this.container.querySelector('.bracket');
    if (!bracket) return;

    const connectorCols = bracket.querySelectorAll('.bracket-connector-col');

    connectorCols.forEach(col => {
      const roundIdx = parseInt((col as HTMLElement).dataset.connector || '0');
      const leftRound = bracket.querySelector(`[data-round="${roundIdx}"]`);
      const rightRound = bracket.querySelector(`[data-round="${roundIdx + 1}"]`);

      if (!leftRound || !rightRound) return;

      const leftWrappers = leftRound.querySelectorAll('.bracket-match-wrapper');
      const rightWrappers = rightRound.querySelectorAll('.bracket-match-wrapper');

      const colRect = col.getBoundingClientRect();
      const colW = colRect.width;

      // Build SVG
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', String(colW));
      svg.setAttribute('height', String(colRect.height));
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';

      const strokeColor =
        getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#ccc';

      // For each pair of left matches → one right match
      rightWrappers.forEach((rightWrapper, rightIdx) => {
        const rightMatch = rightWrapper.querySelector('.bracket-match');
        if (!rightMatch) return;

        const rightRect = rightMatch.getBoundingClientRect();
        const rightMidY = rightRect.top + rightRect.height / 2 - colRect.top;

        // Two feeder matches from left
        const leftIdx1 = rightIdx * 2;
        const leftIdx2 = rightIdx * 2 + 1;

        const leftWrapper1 = leftWrappers[leftIdx1];
        const leftWrapper2 = leftWrappers[leftIdx2];

        const drawLine = (y1: number, _y2: number) => {
          // Horizontal from left match to mid
          const hLine1 = document.createElementNS(svgNS, 'line');
          hLine1.setAttribute('x1', '0');
          hLine1.setAttribute('y1', String(y1));
          hLine1.setAttribute('x2', String(colW / 2));
          hLine1.setAttribute('y2', String(y1));
          hLine1.setAttribute('stroke', strokeColor);
          hLine1.setAttribute('stroke-width', '2');
          svg.appendChild(hLine1);

          // Vertical from y1 to y2 at midpoint
          const vLine = document.createElementNS(svgNS, 'line');
          vLine.setAttribute('x1', String(colW / 2));
          vLine.setAttribute('y1', String(y1));
          vLine.setAttribute('x2', String(colW / 2));
          vLine.setAttribute('y2', String(rightMidY));
          vLine.setAttribute('stroke', strokeColor);
          vLine.setAttribute('stroke-width', '2');
          svg.appendChild(vLine);

          // Horizontal from mid to right match
          const hLine2 = document.createElementNS(svgNS, 'line');
          hLine2.setAttribute('x1', String(colW / 2));
          hLine2.setAttribute('y1', String(rightMidY));
          hLine2.setAttribute('x2', String(colW));
          hLine2.setAttribute('y2', String(rightMidY));
          hLine2.setAttribute('stroke', strokeColor);
          hLine2.setAttribute('stroke-width', '2');
          svg.appendChild(hLine2);
        };

        if (leftWrapper1) {
          const leftMatch1 = leftWrapper1.querySelector('.bracket-match');
          if (leftMatch1) {
            const r1 = leftMatch1.getBoundingClientRect();
            const midY1 = r1.top + r1.height / 2 - colRect.top;
            drawLine(midY1, rightMidY);
          }
        }

        if (leftWrapper2) {
          const leftMatch2 = leftWrapper2.querySelector('.bracket-match');
          if (leftMatch2) {
            const r2 = leftMatch2.getBoundingClientRect();
            const midY2 = r2.top + r2.height / 2 - colRect.top;
            // Only draw if different from the first (avoid overlapping lines at mid)
            // Horizontal from left
            const hLine = document.createElementNS(svgNS, 'line');
            hLine.setAttribute('x1', '0');
            hLine.setAttribute('y1', String(midY2));
            hLine.setAttribute('x2', String(colW / 2));
            hLine.setAttribute('y2', String(midY2));
            hLine.setAttribute('stroke', strokeColor);
            hLine.setAttribute('stroke-width', '2');
            svg.appendChild(hLine);

            // Vertical to join at mid (already drawn by first, but we need from midY2 to rightMidY)
            const vLine = document.createElementNS(svgNS, 'line');
            vLine.setAttribute('x1', String(colW / 2));
            vLine.setAttribute('y1', String(midY2));
            vLine.setAttribute('x2', String(colW / 2));
            vLine.setAttribute('y2', String(rightMidY));
            vLine.setAttribute('stroke', strokeColor);
            vLine.setAttribute('stroke-width', '2');
            svg.appendChild(vLine);
          }
        }
      });

      (col as HTMLElement).style.position = 'relative';
      col.appendChild(svg);
    });
  }

  private attachEventListeners(): void {
    document.querySelectorAll('.result-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
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

      this.advanceWinner(matchObj);
      this.competition!.checkCompletion();
      this.render();
    });
  }

  private advanceWinner(match: Match): void {
    if (match.nextMatchId) {
      const winnerId = match.getWinnerId();
      if (winnerId) {
        this.advancePlayerRecursively(match.nextMatchId, winnerId, match);
      }
    }
  }

  private advancePlayerRecursively(
    nextMatchId: string,
    playerId: string,
    sourceMatch: Match
  ): void {
    const allMatches = getMatches();
    const nextMatch = allMatches.find(m => m.id === nextMatchId);

    if (!nextMatch) {
      return;
    }

    // Use bracketPosition to determine home/away slot (not array index)
    const bracketPos = sourceMatch.bracketPosition ?? 0;
    const isHome = bracketPos % 2 === 0;

    if (isHome) {
      nextMatch.homePlayerId = playerId;
    } else {
      nextMatch.awayPlayerId = playerId;
    }

    // Find the two feeder matches for nextMatch using bracketPosition
    const nextBracketPos = nextMatch.bracketPosition ?? 0;
    const feederPos1 = nextBracketPos * 2; // feeds home
    const feederPos2 = nextBracketPos * 2 + 1; // feeds away

    const sameRoundMatches = allMatches.filter(
      m => m.competitionId === sourceMatch.competitionId && m.round === sourceMatch.round
    );

    const feeder1 = sameRoundMatches.find(m => m.bracketPosition === feederPos1);
    const feeder2 = sameRoundMatches.find(m => m.bracketPosition === feederPos2);

    // Determine if the other feeder will ever produce a player
    const otherFeeder = isHome ? feeder2 : feeder1;
    const otherFeederWillProduce = otherFeeder != null;

    if (nextMatch.homePlayerId && nextMatch.awayPlayerId) {
      // Both players set - match is ready
      nextMatch.status = 'scheduled';
    } else if (!otherFeederWillProduce) {
      // No feeder match on the other side → BYE
      if (!nextMatch.homePlayerId && nextMatch.awayPlayerId) {
        nextMatch.homePlayerId = nextMatch.awayPlayerId;
        nextMatch.awayPlayerId = null;
      }
      nextMatch.status = 'bye';
      nextMatch.isBye = true;

      // Save and recursively advance
      saveMatches(allMatches.map(m => (m.id === nextMatch.id ? nextMatch : m)));

      if (nextMatch.nextMatchId) {
        this.advancePlayerRecursively(
          nextMatch.nextMatchId,
          nextMatch.homePlayerId!,
          Match.fromData(nextMatch)
        );
        return;
      }
    } else {
      // The other side has a match that will produce a player → pending or scheduled
      nextMatch.status = 'pending';
    }

    // Save matches
    const updatedMatches = allMatches.map(m => (m.id === nextMatch.id ? nextMatch : m));
    saveMatches(updatedMatches);
  }
}
