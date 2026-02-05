export default class Navigation {
  private container: HTMLElement;
  private isDarkMode: boolean = false;

  constructor() {
    const element = document.getElementById('navigation');
    if (!element) {
      throw new Error('Navigation container not found');
    }
    this.container = element;
    this.loadDarkMode();
  }

  private loadDarkMode(): void {
    const saved = localStorage.getItem('darkMode');
    this.isDarkMode = saved === 'true';
    this.applyDarkMode();
  }

  private applyDarkMode(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.applyDarkMode();
  }

  render(): void {
    this.container.innerHTML = `
      <div class="nav-container">
        <a href="#/" class="nav-brand">⚽ MatchDay</a>
        <div style="display: flex; align-items: center; gap: 8px;">
          <a href="#/create" class="btn btn-sm btn-primary" style="font-weight: 600;">+ New</a>
          <button class="dark-mode-toggle" id="dark-mode-toggle" title="Toggle dark mode">
            ${this.isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleDarkMode();
        this.render();
      });
    }
  }
}
