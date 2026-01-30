import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import { PartialBlock } from '@blocknote/core';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import HtmlOutlinedIcon from '@mui/icons-material/HtmlOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useAppDispatch, useAppSelector } from '@/store';
import { setTabUnsaved } from '@/store/tabsSlice';
import {
  updateNote,
  deleteNote,
  restoreNote,
} from '../../store/notesSlice';
import { selectAllFolders } from '../../store/foldersSlice';
import { TagPicker } from '../TagPicker';
import { BlockNoteWrapper, type ExportFormat, type NoteExportFunctions } from './BlockNoteWrapper';
import styles from './index.module.css';

// Validate a block has minimum required structure for BlockNote
function isValidBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  if (typeof b.type !== 'string') return false;
  if (b.content !== undefined && !Array.isArray(b.content)) return false;
  if (b.children !== undefined && !Array.isArray(b.children)) return false;
  return true;
}

// Parse BlockNote content from storage
function parseContent(content: string | undefined): PartialBlock[] | undefined {
  if (!content) return undefined;

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    if (!parsed.every(isValidBlock)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

// Error boundary to catch BlockNote initialization errors
interface EditorErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
}

class EditorErrorBoundary extends React.Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  state: EditorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface SingleNoteEditorProps {
  noteId: string;
  isActive: boolean;
}

export const SingleNoteEditor = ({ noteId, isActive }: SingleNoteEditorProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const note = useAppSelector((state) => state.notes.notes.find((n) => n.id === noteId) ?? null);
  const folders = useAppSelector(selectAllFolders);
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const [title, setTitle] = useState(note?.title || '');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null | HTMLElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileTags, setShowMobileTags] = useState(false);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Content getter (replaces window global)
  const getContentRef = useRef<(() => string) | null>(null);
  const handleContentGetterReady = useCallback((getter: (() => string) | null) => {
    getContentRef.current = getter;
  }, []);

  // Export functions
  const exportRef = useRef<NoteExportFunctions | null>(null);
  const handleExportReady = useCallback((exporter: NoteExportFunctions | null) => {
    exportRef.current = exporter;
  }, []);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Track the last saved values
  const lastSavedContentRef = useRef<string>(note?.content || '');
  const lastSavedTitleRef = useRef<string>(note?.title || '');

  // Update title when note changes externally
  React.useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      lastSavedContentRef.current = note.content || '';
      lastSavedTitleRef.current = note.title || '';
      setHasUnsavedChanges(false);
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get initial content for the editor
  const initialContent = useMemo(() => {
    return parseContent(note?.content);
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report unsaved changes to tabsSlice
  useEffect(() => {
    dispatch(setTabUnsaved({ id: noteId, hasUnsavedChanges }));
  }, [dispatch, noteId, hasUnsavedChanges]);

  // Keep a ref to the latest handleSave to avoid stale closures in the timer
  const handleSaveRef = useRef<() => void>(() => {});

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearCountdown = useCallback(() => {
    clearInterval(countdownIntervalRef.current);
    setAutoSaveCountdown(null);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimerRef.current);
    clearInterval(countdownIntervalRef.current);

    setAutoSaveCountdown(10);
    countdownIntervalRef.current = setInterval(() => {
      setAutoSaveCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1_000);

    autoSaveTimerRef.current = setTimeout(() => {
      clearInterval(countdownIntervalRef.current);
      setAutoSaveCountdown(null);
      handleSaveRef.current();
    }, 10_000);
  }, []);

  const handleEditorChange = useCallback(() => {
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleSave = useCallback(async () => {
    if (!note || isSaving) return;

    const content = getContentRef.current ? getContentRef.current() : '[]';
    const updates: { content?: string; title?: string } = {};

    const hasContentChanged = content !== lastSavedContentRef.current;
    const hasTitleChanged = title !== lastSavedTitleRef.current;

    const previousContent = lastSavedContentRef.current;
    const previousTitle = lastSavedTitleRef.current;

    if (hasContentChanged) {
      updates.content = content;
      lastSavedContentRef.current = content;
    }
    if (hasTitleChanged) {
      updates.title = title;
      lastSavedTitleRef.current = title;
    }

    if (hasContentChanged || hasTitleChanged) {
      setIsSaving(true);
      try {
        await dispatch(updateNote({ id: note.id, updates })).unwrap();
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch {
        lastSavedContentRef.current = previousContent;
        lastSavedTitleRef.current = previousTitle;
        enqueueSnackbar(t('Notes.SaveError'), { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    }
  }, [note, title, dispatch, isSaving, t]);
  handleSaveRef.current = handleSave;

  const handleManualSave = useCallback(() => {
    clearTimeout(autoSaveTimerRef.current);
    clearCountdown();
    handleSaveRef.current();
  }, [clearCountdown]);

  // Clear auto-save timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Keyboard shortcut for save (Ctrl/Cmd + S) — only when active
  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleManualSave, isActive]);

  const handleTogglePin = useCallback(() => {
    if (note) {
      dispatch(updateNote({ id: note.id, updates: { isPinned: !note.isPinned } }));
    }
  }, [note, dispatch]);

  const handleDelete = useCallback(() => {
    if (note) {
      dispatch(deleteNote(note.id));
    }
  }, [note, dispatch]);

  const handleRestore = useCallback(async () => {
    if (note) {
      await dispatch(restoreNote(note.id));
      enqueueSnackbar(t('Notes.NoteRestored'), { variant: 'success' });
    }
  }, [note, dispatch, t]);

  const handleFolderMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFolderMenuAnchor(event.currentTarget);
  }, []);

  const handleFolderMenuClose = useCallback(() => {
    setFolderMenuAnchor(null);
  }, []);

  const handleFolderChange = useCallback(
    (folderId: string | null) => {
      if (note) {
        dispatch(updateNote({ id: note.id, updates: { folderId: folderId ?? '' } }));
      }
      setFolderMenuAnchor(null);
    },
    [note, dispatch],
  );

  const handleTagsChange = useCallback(
    (tagIds: string[]) => {
      if (note) {
        dispatch(updateNote({ id: note.id, updates: { tags: tagIds } }));
      }
    },
    [note, dispatch],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExportMenuAnchor(null);
      if (!exportRef.current || !note) return;

      setIsExporting(true);
      try {
        const blob = await exportRef.current.exportTo(format, note.title);
        const ext = format === 'markdown' ? 'md' : format;
        const filename = `${note.title || t('Common.Untitled')}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        enqueueSnackbar(t('Export.Success'), { variant: 'success' });
      } catch (err) {
        console.error('Export failed:', err);
        enqueueSnackbar(t('Export.Error'), { variant: 'error' });
      } finally {
        setIsExporting(false);
      }
    },
    [note, t],
  );

  const currentFolder = folders.find((f) => f.id === note?.folderId);

  if (!note) {
    return null;
  }

  return (
    <Box
      className={`${styles.editorContainer} ${!isActive ? styles.editorHidden : ''}`}
    >
      <Box className={`${styles.header} ${isMobile ? styles.headerMobile : ''}`}>
        {/* Row 1: Title */}
        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder={t('Common.Untitled')}
        />

        {/* Row 2: Actions */}
        <Box className={styles.headerActions}>
          <Tooltip title={t('Notes.MoveToFolder')}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleFolderMenuOpen}
              startIcon={<FolderIcon fontSize="small" />}
              className={styles.folderButton}
            >
              {currentFolder?.name || t('Notes.NoFolder')}
            </Button>
          </Tooltip>
          <Menu
            anchorEl={folderMenuAnchor}
            open={Boolean(folderMenuAnchor)}
            onClose={handleFolderMenuClose}
          >
            <MenuItem onClick={() => handleFolderChange(null)} selected={!note.folderId}>
              <ListItemIcon>
                <FolderOpenIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('Notes.NoFolder')}</ListItemText>
            </MenuItem>
            {folders.map((folder) => (
              <MenuItem
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                selected={note.folderId === folder.id}
              >
                <ListItemIcon>
                  <FolderIcon fontSize="small" sx={{ color: folder.color }} />
                </ListItemIcon>
                <ListItemText>{folder.name}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
          <Tooltip title={t('Notes.SaveShortcut')}>
            <Button
              size="small"
              variant={hasUnsavedChanges ? 'contained' : 'outlined'}
              color={hasUnsavedChanges ? 'primary' : 'inherit'}
              onClick={handleManualSave}
              disabled={isSaving}
              startIcon={
                isSaving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveIcon fontSize="small" />
                )
              }
              className={styles.saveButton}
            >
              {isSaving
                ? t('Common.Saving')
                : hasUnsavedChanges
                  ? t('Common.Save')
                  : t('Common.Saved')}
            </Button>
          </Tooltip>
          <Tooltip title={note.isPinned ? t('Notes.Unpin') : t('Notes.Pin')}>
            <IconButton size="small" onClick={handleTogglePin}>
              {note.isPinned ? (
                <PushPinIcon fontSize="small" color="primary" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Export.Export')}>
            <IconButton
              size="small"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={isExporting}
            >
              {isExporting ? (
                <CircularProgress size={18} />
              ) : (
                <FileDownloadOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <PictureAsPdfOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('Export.PDF')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('docx')}>
              <ListItemIcon>
                <DescriptionOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('Export.DOCX')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('markdown')}>
              <ListItemIcon>
                <CodeOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('Export.Markdown')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('html')}>
              <ListItemIcon>
                <HtmlOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('Export.HTML')}</ListItemText>
            </MenuItem>
          </Menu>
          {isMobile ? (
            <Tooltip title={t('Tags.Tags')}>
              <IconButton
                size="small"
                onClick={() => setShowMobileTags(!showMobileTags)}
                color={showMobileTags || note.tags.length > 0 ? 'primary' : 'default'}
              >
                <LocalOfferOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <TagPicker selectedTagIds={note.tags} onTagsChange={handleTagsChange} />
          )}
          <Box className={styles.actionSpacer} />
          {note.isDeleted ? (
            <Tooltip title={t('Notes.Restore')}>
              <IconButton size="small" onClick={handleRestore} color="success">
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={t('Common.Delete')}>
              <IconButton size="small" onClick={handleDelete} color="error">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Row 3: Tags (mobile only - toggleable) */}
        {isMobile && showMobileTags && (
          <Box className={styles.headerTags}>
            <TagPicker selectedTagIds={note.tags} onTagsChange={handleTagsChange} />
          </Box>
        )}
      </Box>

      {/* Key forces remount when note changes */}
      <EditorErrorBoundary
        key={note.id}
        fallback={
          <BlockNoteWrapper
            initialContent={undefined}
            noteId={note.id}
            onChange={handleEditorChange}
            isMobile={isMobile}
            lastSaved={lastSaved}
            lastSavedLabel={t('Notes.LastSaved')}
            autoSaveCountdown={autoSaveCountdown}
            autoSaveLabel={t('Notes.AutoSaveIn')}
            onContentGetterReady={handleContentGetterReady}
            onExportReady={handleExportReady}
          />
        }
      >
        <BlockNoteWrapper
          initialContent={initialContent}
          noteId={note.id}
          onChange={handleEditorChange}
          isMobile={isMobile}
          lastSaved={lastSaved}
          lastSavedLabel={t('Notes.LastSaved')}
          autoSaveCountdown={autoSaveCountdown}
          autoSaveLabel={t('Notes.AutoSaveIn')}
          onContentGetterReady={handleContentGetterReady}
          onExportReady={handleExportReady}
        />
      </EditorErrorBoundary>
    </Box>
  );
};
