import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxDataProvider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme/ThemeProvider';
import { StyledEngineProvider } from '@mui/material';

// Configure React Query with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - unused data is garbage collected after 10 minutes
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch on component mount if data is stale
    },
    mutations: {
      retry: false, // Don't retry failed mutations
    },
  },
});

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
        <QueryClientProvider client={queryClient}>
          <StyledEngineProvider injectFirst>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </StyledEngineProvider>
        </QueryClientProvider>
      </ReduxDataProvider>
    </React.StrictMode>,
  );
}

initApp();
