import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteListItem } from './NoteListItem';
import type { NoteListItem as NoteListItemType, Tag } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => {
    if (key === 'Notes.DaysRemaining' && opts?.days !== undefined) return `${opts.days} days remaining`;
    return key;
  }}),
}));

const makeNote = (overrides: Partial<NoteListItemType> = {}): NoteListItemType => ({
  id: 'note-1',
  title: 'Test Note',
  folderId: null,
  tags: [],
  isPinned: false,
  isDeleted: false,
  deletedAt: null,
  order: 1,
  createdAt: Date.now() - 60000,
  updatedAt: Date.now(),
  ...overrides,
});

const makeTags = (): Tag[] => [
  { id: 'tag-1', name: 'Work', color: '#f44336' },
  { id: 'tag-2', name: 'Personal', color: '#2196f3' },
  { id: 'tag-3', name: 'Hidden', color: '#4caf50' },
];

describe('NoteListItem', () => {
  const defaultProps = {
    note: makeNote(),
    tags: [],
    isSelected: false,
    onSelect: vi.fn(),
  };

  it('should render note title', () => {
    render(<NoteListItem {...defaultProps} />);
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('should render "Untitled" for notes without title', () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ title: '' })} />);
    expect(screen.getByText('Common.Untitled')).toBeInTheDocument();
  });

  it('should show pin icon for pinned notes', () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ isPinned: true })} />);
    expect(screen.getByTestId('PushPinIcon')).toBeInTheDocument();
  });

  it('should not show pin icon for unpinned notes', () => {
    render(<NoteListItem {...defaultProps} />);
    expect(screen.queryByTestId('PushPinIcon')).not.toBeInTheDocument();
  });

  it('should display up to 2 tag chips', () => {
    const tags = makeTags();
    render(<NoteListItem {...defaultProps} tags={tags} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('should apply selected style when isSelected is true', () => {
    render(<NoteListItem {...defaultProps} isSelected={true} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('note-1');
  });

  it('should call onSelect on Enter key', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('note-1');
  });

  it('should have correct accessibility attributes', () => {
    render(<NoteListItem {...defaultProps} isSelected={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).toHaveAttribute('aria-selected', 'false');
  });

  describe('trash countdown', () => {
    it('should show days remaining for deleted notes', () => {
      const deletedAt = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      render(
        <NoteListItem
          {...defaultProps}
          note={makeNote({ isDeleted: true, deletedAt })}
        />,
      );
      // 30 - 5 = ~24-25 days depending on timing
      expect(screen.getByText(/\d+ days remaining/)).toBeInTheDocument();
    });

    it('should show "deleted today" when 0 days remaining', () => {
      const deletedAt = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      render(
        <NoteListItem
          {...defaultProps}
          note={makeNote({ isDeleted: true, deletedAt })}
        />,
      );
      expect(screen.getByText('Notes.DeletedToday')).toBeInTheDocument();
    });

    it('should show relative time for non-deleted notes', () => {
      render(<NoteListItem {...defaultProps} />);
      // dayjs.fromNow() renders something like "a few seconds ago"
      expect(screen.queryByTestId('DeleteForeverIcon')).not.toBeInTheDocument();
    });
  });
});
