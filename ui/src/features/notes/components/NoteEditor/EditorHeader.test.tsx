import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { EditorHeader } from './EditorHeader';
import type { Note, Folder } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../TagPicker', () => ({
  TagPicker: ({ selectedTagIds }: { selectedTagIds: string[] }) => (
    <div data-testid="tag-picker">{selectedTagIds.length} tags</div>
  ),
}));

const theme = createTheme();

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  title: 'Test Note',
  content: '',
  folderId: null,
  tags: [],
  isPinned: false,
  isDeleted: false,
  deletedAt: null,
  sharedWith: [],
  order: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  syncedAt: null,
  ...overrides,
});

const folders: Folder[] = [
  { id: 'f1', name: 'Work', color: '#f44336', parentId: null, order: 0, createdAt: 0, updatedAt: 0 },
  { id: 'f2', name: 'Personal', color: '#2196f3', parentId: null, order: 1, createdAt: 0, updatedAt: 0 },
];

const defaultProps = {
  note: makeNote(),
  title: 'Test Note',
  onTitleChange: vi.fn(),
  isMobile: false,
  viewMode: 'editor' as const,
  onViewModeChange: vi.fn(),
  folders,
  hasUnsavedChanges: false,
  isSaving: false,
  onSave: vi.fn(),
  onTogglePin: vi.fn(),
  onDelete: vi.fn(),
  onRestore: vi.fn(),
  onFolderChange: vi.fn(),
  onTagsChange: vi.fn(),
  onExport: vi.fn().mockResolvedValue(undefined),
};

const renderWithTheme = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <EditorHeader {...defaultProps} {...props} />
    </ThemeProvider>,
  );

describe('EditorHeader', () => {
  it('should render title input with correct value', () => {
    renderWithTheme();
    const input = screen.getByDisplayValue('Test Note');
    expect(input).toBeInTheDocument();
  });

  it('should call onTitleChange when title is edited', async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    renderWithTheme({ onTitleChange });

    const input = screen.getByDisplayValue('Test Note');
    await user.type(input, '!');
    expect(onTitleChange).toHaveBeenCalled();
  });

  it('should show "Saved" when no unsaved changes', () => {
    renderWithTheme();
    expect(screen.getByTestId('editor-save-button')).toHaveTextContent('Common.Saved');
  });

  it('should show "Save" when there are unsaved changes', () => {
    renderWithTheme({ hasUnsavedChanges: true });
    expect(screen.getByTestId('editor-save-button')).toHaveTextContent('Common.Save');
  });

  it('should show "Saving" when isSaving is true', () => {
    renderWithTheme({ isSaving: true });
    expect(screen.getByTestId('editor-save-button')).toHaveTextContent('Common.Saving');
  });

  it('should disable save button when saving', () => {
    renderWithTheme({ isSaving: true });
    expect(screen.getByTestId('editor-save-button')).toBeDisabled();
  });

  it('should call onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderWithTheme({ onSave, hasUnsavedChanges: true });

    await user.click(screen.getByTestId('editor-save-button'));
    expect(onSave).toHaveBeenCalled();
  });

  it('should show pin button and call onTogglePin', async () => {
    const user = userEvent.setup();
    const onTogglePin = vi.fn();
    renderWithTheme({ onTogglePin });

    await user.click(screen.getByTestId('editor-pin-button'));
    expect(onTogglePin).toHaveBeenCalled();
  });

  it('should show delete button for non-deleted notes', () => {
    renderWithTheme();
    expect(screen.getByTestId('editor-delete-button')).toBeInTheDocument();
    expect(screen.queryByTestId('editor-restore-button')).not.toBeInTheDocument();
  });

  it('should show restore button for deleted notes', () => {
    renderWithTheme({ note: makeNote({ isDeleted: true }) });
    expect(screen.getByTestId('editor-restore-button')).toBeInTheDocument();
    expect(screen.queryByTestId('editor-delete-button')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithTheme({ onDelete });

    await user.click(screen.getByTestId('editor-delete-button'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('should call onRestore when restore button is clicked', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    renderWithTheme({ note: makeNote({ isDeleted: true }), onRestore });

    await user.click(screen.getByTestId('editor-restore-button'));
    expect(onRestore).toHaveBeenCalled();
  });

  describe('folder menu', () => {
    it('should show "No Folder" when note has no folder', () => {
      renderWithTheme();
      expect(screen.getByTestId('editor-folder-button')).toHaveTextContent('Notes.NoFolder');
    });

    it('should show folder name when note is in a folder', () => {
      renderWithTheme({ note: makeNote({ folderId: 'f1' }) });
      expect(screen.getByTestId('editor-folder-button')).toHaveTextContent('Work');
    });

    it('should open folder menu and select a folder', async () => {
      const user = userEvent.setup();
      const onFolderChange = vi.fn();
      renderWithTheme({ onFolderChange });

      await user.click(screen.getByTestId('editor-folder-button'));
      await waitFor(() => {
        expect(screen.getByTestId('editor-folder-f1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('editor-folder-f1'));
      expect(onFolderChange).toHaveBeenCalledWith('f1');
    });

    it('should allow selecting "No Folder"', async () => {
      const user = userEvent.setup();
      const onFolderChange = vi.fn();
      renderWithTheme({ note: makeNote({ folderId: 'f1' }), onFolderChange });

      await user.click(screen.getByTestId('editor-folder-button'));
      await waitFor(() => {
        expect(screen.getByTestId('editor-folder-none')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('editor-folder-none'));
      expect(onFolderChange).toHaveBeenCalledWith(null);
    });
  });

  describe('export menu', () => {
    it('should open export menu and export as markdown', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn().mockResolvedValue(undefined);
      renderWithTheme({ onExport });

      await user.click(screen.getByTestId('editor-export-button'));
      await waitFor(() => {
        expect(screen.getByTestId('editor-export-markdown')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('editor-export-markdown'));
      expect(onExport).toHaveBeenCalledWith('markdown');
    });

    it('should open export menu and export as HTML', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn().mockResolvedValue(undefined);
      renderWithTheme({ onExport });

      await user.click(screen.getByTestId('editor-export-button'));
      await waitFor(() => {
        expect(screen.getByTestId('editor-export-html')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('editor-export-html'));
      expect(onExport).toHaveBeenCalledWith('html');
    });
  });

  describe('view mode toggle', () => {
    it('should render view mode toggle', () => {
      renderWithTheme();
      expect(screen.getByTestId('editor-view-toggle')).toBeInTheDocument();
    });

    it('should call onViewModeChange when toggling', async () => {
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();
      renderWithTheme({ onViewModeChange });

      await user.click(screen.getByTestId('editor-view-markdown'));
      expect(onViewModeChange).toHaveBeenCalledWith('markdown');
    });
  });

  describe('tag picker', () => {
    it('should render TagPicker on desktop', () => {
      renderWithTheme();
      expect(screen.getByTestId('tag-picker')).toBeInTheDocument();
    });

    it('should render tag toggle button on mobile', () => {
      renderWithTheme({ isMobile: true });
      expect(screen.getByTestId('editor-tags-toggle')).toBeInTheDocument();
      expect(screen.queryByTestId('tag-picker')).not.toBeInTheDocument();
    });
  });

  describe('mobile controls', () => {
    it('should show controls toggle on mobile', () => {
      renderWithTheme({ isMobile: true });
      expect(screen.getByTestId('editor-controls-toggle')).toBeInTheDocument();
    });

    it('should not show controls toggle on desktop', () => {
      renderWithTheme({ isMobile: false });
      expect(screen.queryByTestId('editor-controls-toggle')).not.toBeInTheDocument();
    });
  });
});
