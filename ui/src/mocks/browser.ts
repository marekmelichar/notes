// eslint-disable-next-line import/no-extraneous-dependencies
import { setupWorker } from 'msw/browser';

// Import custom handlers
import { handlers } from './handlers';

// Setup MSW worker for browser environment
export const worker = setupWorker(...handlers);

// Custom start options to reduce console noise from unhandled requests
export const workerOptions = {
  onUnhandledRequest: (request: Request, print: { warning: () => void }) => {
    const url = new URL(request.url);

    // Silently pass through:
    // - Local development assets (tsx, css, js, etc)
    // - Vite HMR and dev server requests
    if (
      url.hostname === 'localhost' ||
      url.pathname.includes('.tsx') ||
      url.pathname.includes('.ts') ||
      url.pathname.includes('.css') ||
      url.pathname.includes('.js') ||
      url.pathname.includes('.svg') ||
      url.pathname.includes('.png') ||
      url.pathname.includes('.ttf') ||
      url.pathname.includes('.woff') ||
      url.pathname.includes('.json') ||
      url.pathname.includes('node_modules') ||
      url.pathname.includes('@vite') ||
      url.pathname.includes('@fs')
    ) {
      return;
    }

    // Warn about unhandled API requests
    print.warning();
  },
};
