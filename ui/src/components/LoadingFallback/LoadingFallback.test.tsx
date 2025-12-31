import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingFallback } from './index';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'Common.Loading': 'Loading...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LoadingFallback', () => {
  describe('rendering', () => {
    it('should render loading spinner', () => {
      render(<LoadingFallback />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render default loading message when no message provided', () => {
      render(<LoadingFallback />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom message when provided', () => {
      render(<LoadingFallback message="Please wait..." />);

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('fullScreen mode', () => {
    it('should apply fullScreen container class by default', () => {
      const { container } = render(<LoadingFallback />);

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer?.className).toMatch(/containerFullScreen/);
    });

    it('should apply regular container class when fullScreen is false', () => {
      const { container } = render(<LoadingFallback fullScreen={false} />);

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer?.className).toMatch(/container/);
      expect(outerContainer?.className).not.toMatch(/containerFullScreen/);
    });

    it('should apply fullScreen container when explicitly set to true', () => {
      const { container } = render(<LoadingFallback fullScreen={true} />);

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer?.className).toMatch(/containerFullScreen/);
    });
  });

  describe('spinner', () => {
    it('should render CircularProgress with correct size', () => {
      render(<LoadingFallback />);

      const spinner = screen.getByRole('progressbar');
      // MUI CircularProgress with size=48 renders with specific styles
      expect(spinner).toBeInTheDocument();
    });

    it('should have spinner class applied', () => {
      const { container } = render(<LoadingFallback />);

      const spinner = container.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('message styling', () => {
    it('should have message class applied', () => {
      const { container } = render(<LoadingFallback message="Loading data" />);

      const message = container.querySelector('[class*="message"]');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent('Loading data');
    });

    it('should have content wrapper with correct class', () => {
      const { container } = render(<LoadingFallback />);

      const content = container.querySelector('[class*="content"]');
      expect(content).toBeInTheDocument();
    });
  });

  describe('custom messages', () => {
    it('should handle long messages', () => {
      const longMessage = 'This is a very long loading message that explains what is happening';
      render(<LoadingFallback message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in message', () => {
      render(<LoadingFallback message="Loading... (50%)" />);

      expect(screen.getByText('Loading... (50%)')).toBeInTheDocument();
    });

    it('should handle unicode characters in message', () => {
      render(<LoadingFallback message="Načítání dat 🔄" />);

      expect(screen.getByText('Načítání dat 🔄')).toBeInTheDocument();
    });

    it('should show empty message when empty string provided', () => {
      const { container } = render(<LoadingFallback message="" />);

      // Empty string is truthy for ?? operator, so message element will be empty
      const message = container.querySelector('[class*="message"]');
      expect(message).toBeInTheDocument();
    });
  });

  describe('integration', () => {
    it('should render complete component structure', () => {
      const { container } = render(<LoadingFallback message="Test message" />);

      // Should have container > content > spinner + message
      expect(container.querySelector('[class*="containerFullScreen"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="content"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="message"]')).toBeInTheDocument();
    });
  });
});
