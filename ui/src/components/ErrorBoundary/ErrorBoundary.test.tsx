import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './index';

// Mock i18next
vi.mock('i18next', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'ErrorPage.Title': 'Something went wrong',
      'ErrorPage.Message': 'An unexpected error occurred. Please try again.',
      'ErrorPage.ReloadPage': 'Reload Page',
      'ErrorPage.GoHome': 'Go Home',
    };
    return translations[key] || key;
  },
}));

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Content rendered successfully</div>;
};

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's error boundary logging
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should render nested components correctly', () => {
      render(
        <ErrorBoundary>
          <div>
            <span>Nested content</span>
          </div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText('An unexpected error occurred. Please try again.'),
      ).toBeInTheDocument();
    });

    it('should display reload and home buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument();
    });

    it('should display error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('ErrorOutlineIcon')).toBeInTheDocument();
    });

    it('should not show children content after error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.queryByText('Content rendered successfully')).not.toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render complex custom fallback', () => {
      const customFallback = (
        <div>
          <h1>Oops!</h1>
          <p>Something broke</p>
          <button>Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Oops!')).toBeInTheDocument();
      expect(screen.getByText('Something broke')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  describe('button actions', () => {
    it('should call window.location.reload when reload button is clicked', async () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Reload Page' }));

      expect(reloadMock).toHaveBeenCalled();
    });

    it('should navigate to home when go home button is clicked', async () => {
      let navigatedTo = '';
      Object.defineProperty(window, 'location', {
        value: {
          get href() {
            return navigatedTo;
          },
          set href(value: string) {
            navigatedTo = value;
          },
        },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Go Home' }));

      expect(navigatedTo).toBe('/');
    });
  });

  describe('error details in development', () => {
    it('should show error message in development mode', () => {
      // import.meta.env.DEV is true in test environment by default
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // In development, error details should be shown
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('componentDidCatch', () => {
    it('should log error to console in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // console.error should have been called (we mocked it)
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('state management', () => {
    it('should initialize with hasError false', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Content rendered successfully')).toBeInTheDocument();
    });

    it('should set hasError true when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // The presence of error UI indicates hasError is true
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('should apply container class to error UI', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(container.querySelector('[class*="container"]')).toBeInTheDocument();
    });

    it('should apply content class to content wrapper', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(container.querySelector('[class*="content"]')).toBeInTheDocument();
    });

    it('should apply icon class to error icon', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(container.querySelector('[class*="icon"]')).toBeInTheDocument();
    });

    it('should apply actions class to button container', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(container.querySelector('[class*="actions"]')).toBeInTheDocument();
    });
  });
});
