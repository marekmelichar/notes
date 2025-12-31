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

// Mock flag images
vi.mock('@/assets/Flag_CZ.svg', () => ({ default: 'flag-cz.svg' }));
vi.mock('@/assets/Flag_SK.svg', () => ({ default: 'flag-sk.svg' }));
vi.mock('@/assets/Flag_EN.svg', () => ({ default: 'flag-en.svg' }));
vi.mock('@/assets/Flag_HU.svg', () => ({ default: 'flag-hu.svg' }));
vi.mock('@/assets/Flag_DE.svg', () => ({ default: 'flag-de.svg' }));
vi.mock('@/assets/Flag_IT.svg', () => ({ default: 'flag-it.svg' }));

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
      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toBeInTheDocument();
    });

    it('should display the current language flag for English', () => {
      i18n.language = 'en';
      renderWithTheme(<LanguageSwitch />);
      const flag = screen.getByAltText('English');
      expect(flag).toBeInTheDocument();
    });

    it('should display Slovak flag when language is Slovak', () => {
      i18n.language = 'sk';
      renderWithTheme(<LanguageSwitch />);
      const flag = screen.getByAltText('Slovensky');
      expect(flag).toBeInTheDocument();
    });

    it('should display Czech flag when language is Czech', () => {
      i18n.language = 'cs';
      renderWithTheme(<LanguageSwitch />);
      const flag = screen.getByAltText('Čeština');
      expect(flag).toBeInTheDocument();
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

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
    });

    it('should display all language options in popover', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Slovensky')).toBeInTheDocument();
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Deutsch')).toBeInTheDocument();
        expect(screen.getByText('Magyar')).toBeInTheDocument();
        expect(screen.getByText('Italiano')).toBeInTheDocument();
        expect(screen.getByText('Čeština')).toBeInTheDocument();
      });
    });
  });

  describe('Closing Popover', () => {
    it('should close popover when button is clicked again', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
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
    it('should call i18n.changeLanguage when selecting Slovak', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Slovensky')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Slovensky'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('sk');
    });

    it('should close popover after selecting a language', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Deutsch')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Deutsch'));

      await waitFor(() => {
        expect(screen.queryByText('Deutsch')).not.toBeInTheDocument();
      });
    });

    it('should change language to German', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.click(screen.getByRole('button', { name: /Přepnout jazyk/i }));
      await waitFor(() => screen.getByText('Deutsch'));
      await user.click(screen.getByText('Deutsch'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
    });

    it('should change language to Hungarian', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.click(screen.getByRole('button', { name: /Přepnout jazyk/i }));
      await waitFor(() => screen.getByText('Magyar'));
      await user.click(screen.getByText('Magyar'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('hu');
    });

    it('should change language to Italian', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.click(screen.getByRole('button', { name: /Přepnout jazyk/i }));
      await waitFor(() => screen.getByText('Italiano'));
      await user.click(screen.getByText('Italiano'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('it');
    });

    it('should change language to Czech', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.click(screen.getByRole('button', { name: /Přepnout jazyk/i }));
      await waitFor(() => screen.getByText('Čeština'));
      await user.click(screen.getByText('Čeština'));

      expect(i18n.changeLanguage).toHaveBeenCalledWith('cs');
    });
  });

  describe('Language Code Matching', () => {
    it('should match language code from locale string like en-US', () => {
      i18n.language = 'en-US';
      renderWithTheme(<LanguageSwitch />);

      const flag = screen.getByAltText('English');
      expect(flag).toBeInTheDocument();
    });

    it('should match language code from locale string like sk-SK', () => {
      i18n.language = 'sk-SK';
      renderWithTheme(<LanguageSwitch />);

      const flag = screen.getByAltText('Slovensky');
      expect(flag).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should render in light mode', () => {
      renderWithTheme(<LanguageSwitch />, 'light');
      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      renderWithTheme(<LanguageSwitch />, 'dark');
      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      renderWithTheme(<LanguageSwitch />);
      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toHaveAccessibleName();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      await user.tab();
      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toHaveFocus();
    });

    it('should open popover with Enter key', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
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

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });

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

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Component State', () => {
    it('should maintain open state correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LanguageSwitch />);

      const button = screen.getByRole('button', { name: /Přepnout jazyk/i });

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
