import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThemeToggle } from './index';

// Mock the theme provider hook
const mockToggleColorMode = vi.fn();
const mockUseColorMode = vi.fn();

vi.mock('@/theme/ThemeProvider', () => ({
  useColorMode: () => mockUseColorMode(),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Light Mode', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should render an icon button', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render DarkModeOutlinedIcon when in light mode', () => {
      const { container } = render(<ThemeToggle />);
      const darkIcon = container.querySelector('[data-testid="DarkModeOutlinedIcon"]');
      expect(darkIcon).toBeInTheDocument();
    });

    it('should not render LightModeOutlinedIcon when in light mode', () => {
      const { container } = render(<ThemeToggle />);
      const lightIcon = container.querySelector('[data-testid="LightModeOutlinedIcon"]');
      expect(lightIcon).not.toBeInTheDocument();
    });

    it('should render button with inherit color', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-colorInherit');
    });
  });

  describe('Rendering - Dark Mode', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should render an icon button', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render LightModeOutlinedIcon when in dark mode', () => {
      const { container } = render(<ThemeToggle />);
      const lightIcon = container.querySelector('[data-testid="LightModeOutlinedIcon"]');
      expect(lightIcon).toBeInTheDocument();
    });

    it('should not render DarkModeOutlinedIcon when in dark mode', () => {
      const { container } = render(<ThemeToggle />);
      const darkIcon = container.querySelector('[data-testid="DarkModeOutlinedIcon"]');
      expect(darkIcon).not.toBeInTheDocument();
    });

    it('should render button with inherit color', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-colorInherit');
    });
  });

  describe('User Interactions - Light Mode', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should call toggleColorMode when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalledTimes(1);
    });

    it('should call toggleColorMode on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalledTimes(3);
    });

    it('should not call toggleColorMode without interaction', () => {
      render(<ThemeToggle />);
      expect(mockToggleColorMode).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions - Dark Mode', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should call toggleColorMode when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalledTimes(1);
    });

    it('should call toggleColorMode on multiple clicks', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalledTimes(2);
    });
  });

  describe('Keyboard Interactions', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should call toggleColorMode when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockToggleColorMode).toHaveBeenCalledTimes(1);
    });

    it('should call toggleColorMode when Space key is pressed', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(mockToggleColorMode).toHaveBeenCalledTimes(1);
    });

    it('should be focusable with tab navigation', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.tab();

      const button = screen.getByRole('button');
      expect(button).toHaveFocus();
    });
  });

  describe('Theme Context Integration', () => {
    it('should call useColorMode hook', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      render(<ThemeToggle />);

      expect(mockUseColorMode).toHaveBeenCalledTimes(1);
    });

    it('should use mode value from useColorMode', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });

      const { container } = render(<ThemeToggle />);
      const lightIcon = container.querySelector('[data-testid="LightModeOutlinedIcon"]');

      expect(lightIcon).toBeInTheDocument();
    });

    it('should use toggleColorMode function from useColorMode', async () => {
      const customToggle = vi.fn();
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: customToggle,
      });

      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole('button'));

      expect(customToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Icon Switching', () => {
    it('should switch from DarkModeIcon to LightModeIcon when mode changes', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      const { container, rerender } = render(<ThemeToggle />);

      expect(container.querySelector('[data-testid="DarkModeOutlinedIcon"]')).toBeInTheDocument();

      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });

      rerender(<ThemeToggle />);

      expect(container.querySelector('[data-testid="LightModeOutlinedIcon"]')).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="DarkModeOutlinedIcon"]'),
      ).not.toBeInTheDocument();
    });

    it('should switch from LightModeIcon to DarkModeIcon when mode changes', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });

      const { container, rerender } = render(<ThemeToggle />);

      expect(container.querySelector('[data-testid="LightModeOutlinedIcon"]')).toBeInTheDocument();

      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      rerender(<ThemeToggle />);

      expect(container.querySelector('[data-testid="DarkModeOutlinedIcon"]')).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="LightModeOutlinedIcon"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Button Properties', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should render as an IconButton component', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-root');
    });

    it('should not be disabled by default', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should have type button', () => {
      render(<ThemeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });
    });

    it('should have button role', () => {
      render(<ThemeToggle />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.tab();
      const button = screen.getByRole('button');

      expect(button).toHaveFocus();
    });

    it('should be clickable', async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalled();
    });

    it('should contain an icon element', () => {
      const { container } = render(<ThemeToggle />);
      const svgIcon = container.querySelector('svg');

      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks without errors', async () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');

      // Simulate rapid clicking
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockToggleColorMode).toHaveBeenCalledTimes(5);
    });

    it('should render correctly when mode is explicitly set to light', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light' as const,
        toggleColorMode: mockToggleColorMode,
      });

      const { container } = render(<ThemeToggle />);

      expect(container.querySelector('[data-testid="DarkModeOutlinedIcon"]')).toBeInTheDocument();
    });

    it('should render correctly when mode is explicitly set to dark', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'dark' as const,
        toggleColorMode: mockToggleColorMode,
      });

      const { container } = render(<ThemeToggle />);

      expect(container.querySelector('[data-testid="LightModeOutlinedIcon"]')).toBeInTheDocument();
    });

    it('should not crash when toggleColorMode is called multiple times', async () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole('button');

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(() => {
        expect(mockToggleColorMode).toHaveBeenCalledTimes(3);
      }).not.toThrow();
    });
  });

  describe('Re-rendering', () => {
    it('should update icon when mode prop changes', () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      const { container, rerender } = render(<ThemeToggle />);

      const darkIcon = container.querySelector('[data-testid="DarkModeOutlinedIcon"]');
      expect(darkIcon).toBeInTheDocument();

      mockUseColorMode.mockReturnValue({
        mode: 'dark',
        toggleColorMode: mockToggleColorMode,
      });

      rerender(<ThemeToggle />);

      const lightIcon = container.querySelector('[data-testid="LightModeOutlinedIcon"]');
      expect(lightIcon).toBeInTheDocument();
    });

    it('should maintain functionality after re-render', async () => {
      mockUseColorMode.mockReturnValue({
        mode: 'light',
        toggleColorMode: mockToggleColorMode,
      });

      const user = userEvent.setup();
      const { rerender } = render(<ThemeToggle />);

      await user.click(screen.getByRole('button'));
      expect(mockToggleColorMode).toHaveBeenCalledTimes(1);

      rerender(<ThemeToggle />);

      await user.click(screen.getByRole('button'));
      expect(mockToggleColorMode).toHaveBeenCalledTimes(2);
    });
  });
});
