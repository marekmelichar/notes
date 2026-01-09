import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';
import { LanguageSwitch } from './index';
import i18n from '@/i18n';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

const renderWithTheme = (component: React.ReactElement, mode: 'light' | 'dark' = 'light') => {
  const theme = createTheme({
    palette: {
      mode,
    },
  });
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('LanguageSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.language = 'en';
  });

  describe('Rendering - Initial State', () => {
    it('should render the language switch button', () => {
      renderWithTheme(<LanguageSwitch />);
      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toBeInTheDocument();
    });

    it('should not show popover by default', () => {
      renderWithTheme(<LanguageSwitch />);
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    });
  });

  describe('Opening Popover', () => {
    it('should open popover when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
    });

    it('should display all language options in popover', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Čeština')).toBeInTheDocument();
      });
    });
  });

  describe('Closing Popover', () => {
    it('should close popover when button is clicked again', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });

      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByText('English')).not.toBeInTheDocument();
      });
    });
  });

  describe('Language Selection', () => {
    it('should call i18n.changeLanguage when selecting Czech', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Čeština')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Čeština'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('cs');
    });

    it('should close popover after selecting a language', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Čeština')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Čeština'));

      await waitFor(() => {
        expect(screen.queryByText('Čeština')).not.toBeInTheDocument();
      });
    });

    it('should change language to English', async () => {
      const user = userEvent.setup();
      i18n.language = 'cs';
      renderWithTheme(<LanguageSwitch />);

      await user.click(screen.getByRole('button', { name: /Switch language/i }));
      await waitFor(() => screen.getByText('English'));
      await user.click(screen.getByText('English'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Language Code Matching', () => {
    it('should match language code from locale string like en-US', () => {
      i18n.language = 'en-US';
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByTestId('language-switch-button');
      expect(button).toHaveAttribute('data-language', 'en');
    });

    it('should match language code from locale string like cs-CZ', () => {
      i18n.language = 'cs-CZ';
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByTestId('language-switch-button');
      expect(button).toHaveAttribute('data-language', 'cs');
    });
  });

  describe('Theme Integration', () => {
    it('should render in light mode', () => {
      renderWithTheme(<LanguageSwitch />, 'light');
      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      renderWithTheme(<LanguageSwitch />, 'dark');
      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      renderWithTheme(<LanguageSwitch />);
      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toHaveAccessibleName();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.tab();
      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toHaveFocus();
    });

    it('should open popover with Enter key', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      button.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close clicks', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(button).toBeInTheDocument();
    });

    it('should handle unknown language code gracefully', () => {
      i18n.language = 'unknown';

      expect(() => renderWithTheme(<LanguageSwitch />)).not.toThrow();
    });

    it('should render button even without matching language', () => {
      i18n.language = 'xyz';
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Component State', () => {
    it('should maintain open state correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Switch language/i });

      expect(screen.queryByText('English')).not.toBeInTheDocument();

      await user.click(button);
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });

      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('English')).not.toBeInTheDocument();
      });
    });
  });
});
