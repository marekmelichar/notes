import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxDataProvider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import '@/i18n';
import { ThemeProvider } from './theme/ThemeProvider';
import { StyledEngineProvider } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    unknown: {
      main: string;
      light: string;
    };
  }

  interface TypeBackground {
    primary: string;
    secondary: string;
    selected: string;
  }

  interface PaletteOptions {
    unknown?: {
      main: string;
      light: string;
    };
  }
}


/**
 * Initialize and render the application
 * In mock mode, MSW is started first to intercept API calls
 */
async function initApp() {
  // Start MSW in mock mode (only in development builds)
  if (!import.meta.env.PROD && window.MOCK_MODE) {
    const { worker, workerOptions } = await import('./mocks/browser');
    await worker.start({
      ...workerOptions,
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('MSW started - intercepting API requests');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ReduxDataProvider store={store}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </StyledEngineProvider>
      </ReduxDataProvider>
    </React.StrictMode>,
  );
}

initApp();
