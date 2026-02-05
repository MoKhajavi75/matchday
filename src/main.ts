import Navigation from './components/Navigation';
import { getCompetition, initializeStorage } from './state';
import './styles/components.css';
import './styles/dark-mode.css';
import './styles/footer.css';
import './styles/layout.css';
import './styles/main.css';
import router from './utils/router';
import CreateView from './views/CreateView';
import CupView from './views/CupView';
import HomeView from './views/HomeView';
import LeagueView from './views/LeagueView';

class App {
  private navigation: Navigation;

  constructor() {
    this.navigation = new Navigation();
    this.init();
  }

  init(): void {
    try {
      initializeStorage();
      this.renderFooterVersion();
      this.setupRoutes();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError((error as Error).message);
    }
  }

  renderFooterVersion(): void {
    const el = document.getElementById('app-version');
    if (el) el.textContent = `v${__APP_VERSION__}`;
  }

  setupRoutes(): void {
    router.addRoute('/', () => {
      this.navigation.render();
      const view = new HomeView();
      view.render();
    });

    router.addRoute('/create', () => {
      this.navigation.render();
      const view = new CreateView();
      view.render();
    });

    router.addRoute('/league/:id', params => {
      const competition = getCompetition(params.id);
      if (competition) {
        this.navigation.render();
        const view = new LeagueView(params.id);
        view.render();
      } else {
        router.navigate('/');
      }
    });

    router.addRoute('/cup/:id', params => {
      const competition = getCompetition(params.id);
      if (competition) {
        this.navigation.render();
        const view = new CupView(params.id);
        view.render();
      } else {
        router.navigate('/');
      }
    });

    router.handleRoute();
  }

  showError(message: string): void {
    const container = document.getElementById('main-content');
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px;">
          <h2 style="color: var(--danger);">Error</h2>
          <p>${message}</p>
          <p class="text-secondary mt-2">Please ensure your browser supports localStorage.</p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
