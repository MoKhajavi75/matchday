import type { RouteHandler, RouteParams } from '../types';

class Router {
  private routes: Record<string, RouteHandler> = {};
  private currentRoute: string | null = null;
  private params: RouteParams = {};

  constructor() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  addRoute(path: string, handler: RouteHandler): void {
    this.routes[path] = handler;
  }

  handleRoute(): void {
    const hash = window.location.hash.slice(1) || '/';

    let matchedRoute: RouteHandler | null = null;
    let params: RouteParams = {};

    if (this.routes[hash]) {
      matchedRoute = this.routes[hash];
    } else {
      for (const [route, handler] of Object.entries(this.routes)) {
        const routeParts = route.split('/').filter(Boolean);
        const hashParts = hash.split('/').filter(Boolean);

        if (routeParts.length === hashParts.length) {
          let isMatch = true;
          const routeParams: RouteParams = {};

          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              const paramName = routeParts[i].slice(1);
              routeParams[paramName] = hashParts[i];
            } else if (routeParts[i] !== hashParts[i]) {
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            matchedRoute = handler;
            params = routeParams;
            break;
          }
        }
      }
    }

    if (matchedRoute) {
      this.currentRoute = hash;
      this.params = params;
      matchedRoute(params);
    } else {
      this.navigate('/');
    }
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  getParams(): RouteParams {
    return this.params;
  }

  getCurrentRoute(): string | null {
    return this.currentRoute;
  }
}

export default new Router();
