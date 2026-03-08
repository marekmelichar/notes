import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorFooter } from './EditorFooter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('EditorFooter', () => {
  const defaultProps = {
    wordCount: 42,
    charCount: 256,
    autoSaveCountdown: null,
    autoSaveLabel: 'Auto-save in',
    lastSaved: null,
    lastSavedLabel: 'Last saved',
  };

  it('should display word and character count', () => {
    render(<EditorFooter {...defaultProps} />);

    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/256/)).toBeInTheDocument();
    expect(screen.getByText(/Notes\.Words/)).toBeInTheDocument();
    expect(screen.getByText(/Notes\.Characters/)).toBeInTheDocument();
  });

  it('should display auto-save countdown when active', () => {
    render(<EditorFooter {...defaultProps} autoSaveCountdown={7} />);

    expect(screen.getByText(/Auto-save in 7s/)).toBeInTheDocument();
  });

  it('should not display countdown when null', () => {
    render(<EditorFooter {...defaultProps} autoSaveCountdown={null} />);

    expect(screen.queryByText(/Auto-save in/)).not.toBeInTheDocument();
  });

  it('should display last saved time', () => {
    const lastSaved = new Date('2026-03-08T14:30:00');
    render(<EditorFooter {...defaultProps} lastSaved={lastSaved} />);

    expect(screen.getByText(/Last saved/)).toBeInTheDocument();
    // The time format depends on locale, just check it renders
    expect(screen.getByText(new RegExp(lastSaved.toLocaleTimeString()))).toBeInTheDocument();
  });

  it('should not display last saved when null', () => {
    render(<EditorFooter {...defaultProps} lastSaved={null} />);

    expect(screen.queryByText(/Last saved/)).not.toBeInTheDocument();
  });

  it('should display both countdown and last saved simultaneously', () => {
    const lastSaved = new Date('2026-03-08T14:30:00');
    render(
      <EditorFooter
        {...defaultProps}
        autoSaveCountdown={3}
        lastSaved={lastSaved}
      />,
    );

    expect(screen.getByText(/Auto-save in 3s/)).toBeInTheDocument();
    expect(screen.getByText(/Last saved/)).toBeInTheDocument();
  });

  it('should display zero word and char count', () => {
    render(<EditorFooter {...defaultProps} wordCount={0} charCount={0} />);

    expect(screen.getByText(/0 Notes\.Words/)).toBeInTheDocument();
    expect(screen.getByText(/0 Notes\.Characters/)).toBeInTheDocument();
  });
});
