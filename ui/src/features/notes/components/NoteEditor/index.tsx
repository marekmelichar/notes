import React, { useCallback, useState, useRef, useMemo } from 'react';
import { Box, IconButton, Typography, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Button, CircularProgress, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { enqueueSnackbar } from 'notistack';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import { useAppDispatch, useAppSelector } from '@/store';
import { useColorMode } from '@/theme/ThemeProvider';
import {
  updateNote,
  deleteNote,
  selectSelectedNote,
} from '../../store/notesSlice';
import { selectAllFolders } from '../../store/foldersSlice';
import { TagPicker } from '../TagPicker';
import { filesApi } from '../../services/filesApi';
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
    // Validate each top-level block has required structure
    if (!parsed.every(isValidBlock)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

// Error boundary to catch BlockNote initialization errors (e.g., invalid content format)
interface EditorErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
}

class EditorErrorBoundary extends React.Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
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

const MAX_FILE_SIZE = 104_857_600; // 100 MB

// Separate component for the BlockNote editor to handle remounting on note change
interface BlockNoteEditorProps {
  initialContent: PartialBlock[] | undefined;
  noteId?: string;
  onSave: (content: string) => void;
  onChange: () => void;
  isMobile: boolean;
  lastSaved: Date | null;
  lastSavedLabel: string;
}

const BlockNoteEditor = ({ initialContent, noteId, onChange, isMobile, lastSaved, lastSavedLabel }: BlockNoteEditorProps) => {
  const { t } = useTranslation();
  const { mode } = useColorMode();
  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file: File) => {
      if (!navigator.onLine) {
        enqueueSnackbar(t('Files.OfflineError'), { variant: 'error' });
        throw new Error('Offline');
      }
      if (file.size > MAX_FILE_SIZE) {
        enqueueSnackbar(t('Files.TooLarge'), { variant: 'error' });
        throw new Error('File too large');
      }
      try {
        const response = await filesApi.upload(file, noteId);
        return response.url;
      } catch (err) {
        const detail = err instanceof Error ? err.message : '';
        const status = (err as { response?: { status?: number } })?.response?.status;
        const serverMsg = (err as { response?: { data?: string } })?.response?.data;
        const info = serverMsg || (status ? `HTTP ${status}` : detail);
        enqueueSnackbar(`${t('Files.UploadError')}: ${info}`, { variant: 'error' });
        throw err;
      }
    },
  });

  // Calculate word count from blocks
  const getTextFromBlocks = (blocks: Block[]): string => {
    let text = '';
    for (const block of blocks) {
      if (block.content && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === 'text' && item.text) {
            text += item.text + ' ';
          }
        }
      }
      if (block.children) {
        text += getTextFromBlocks(block.children as Block[]);
      }
    }
    return text;
  };

  const textContent = getTextFromBlocks(editor.document);
  const charCount = textContent.replace(/\s/g, '').length;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  const handleChange = useCallback(() => {
    onChange();
  }, [onChange]);

  // Expose save method via callback
  const handleSaveContent = useCallback(() => {
    return JSON.stringify(editor.document);
  }, [editor]);

  // Store the save handler for parent to call
  React.useEffect(() => {
    (window as unknown as Record<string, () => string>).__blockNoteGetContent = handleSaveContent;
    return () => {
      delete (window as unknown as Record<string, () => string>).__blockNoteGetContent;
    };
  }, [handleSaveContent]);

  return (
    <>
      <Box className={`${styles.editorContent} ${isMobile ? styles.editorContentMobile : ''}`}>
        <BlockNoteView
          editor={editor}
          theme={mode}
          onChange={handleChange}
          sideMenu={false}
        />
      </Box>
      <Box className={styles.footer}>
        <Typography variant="caption">
          {wordCount} words | {charCount} characters
        </Typography>
        {lastSaved && (
          <Typography variant="caption">
            {lastSavedLabel} {lastSaved.toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </>
  );
};

export const NoteEditor = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectSelectedNote);
  const folders = useAppSelector(selectAllFolders);
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const [title, setTitle] = useState(note?.title || '');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null | HTMLElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track the last saved values
  const lastSavedContentRef = useRef<string>(note?.content || '');
  const lastSavedTitleRef = useRef<string>(note?.title || '');

  // Update title when note changes
  React.useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      lastSavedContentRef.current = note.content || '';
      lastSavedTitleRef.current = note.title || '';
      setHasUnsavedChanges(false);
    }
  }, [note?.id]);

  // Get initial content for the editor
  const initialContent = useMemo(() => {
    return parseContent(note?.content);
  }, [note?.id]);

  const handleEditorChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle title changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      setHasUnsavedChanges(true);
    },
    [],
  );

  // Manual save handler
  const handleSave = useCallback(async () => {
    if (!note || isSaving) return;

    const getContent = (window as unknown as Record<string, () => string>).__blockNoteGetContent;
    const content = getContent ? getContent() : '[]';
    const updates: { content?: string; title?: string } = {};

    const hasContentChanged = content !== lastSavedContentRef.current;
    const hasTitleChanged = title !== lastSavedTitleRef.current;

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
      } finally {
        setIsSaving(false);
      }
    }
  }, [note, title, dispatch, isSaving]);

  // Keyboard shortcut for save (Ctrl/Cmd + S)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

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

  const handleFolderMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFolderMenuAnchor(event.currentTarget);
  }, []);

  const handleFolderMenuClose = useCallback(() => {
    setFolderMenuAnchor(null);
  }, []);

  const handleFolderChange = useCallback((folderId: string | null) => {
    if (note) {
      dispatch(updateNote({ id: note.id, updates: { folderId: folderId ?? '' } }));
    }
    setFolderMenuAnchor(null);
  }, [note, dispatch]);

  const handleTagsChange = useCallback((tagIds: string[]) => {
    if (note) {
      dispatch(updateNote({ id: note.id, updates: { tags: tagIds } }));
    }
  }, [note, dispatch]);

  const currentFolder = folders.find(f => f.id === note?.folderId);

  if (!note) {
    return (
      <Box className={styles.emptyState}>
        <NoteOutlinedIcon className={styles.emptyStateIcon} />
        <Typography variant="h6">{t("Notes.SelectNote")}</Typography>
        <Typography variant="body2">
          {t("Notes.SelectNoteHint")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={styles.editorContainer}>
      <Box className={`${styles.header} ${isMobile ? styles.headerMobile : ''}`}>
        {/* Row 1: Title */}
        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder={t("Common.Untitled")}
        />

        {/* Row 2: Actions */}
        <Box className={styles.headerActions}>
          <Tooltip title={t("Notes.MoveToFolder")}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleFolderMenuOpen}
              startIcon={<FolderIcon fontSize="small" />}
              className={styles.folderButton}
            >
              {currentFolder?.name || t("Notes.NoFolder")}
            </Button>
          </Tooltip>
          <Menu
            anchorEl={folderMenuAnchor}
            open={Boolean(folderMenuAnchor)}
            onClose={handleFolderMenuClose}
          >
            <MenuItem
              onClick={() => handleFolderChange(null)}
              selected={!note.folderId}
            >
              <ListItemIcon>
                <FolderOpenIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t("Notes.NoFolder")}</ListItemText>
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
          <Tooltip title={t("Notes.SaveShortcut")}>
            <Button
              size="small"
              variant={hasUnsavedChanges ? 'contained' : 'outlined'}
              color={hasUnsavedChanges ? 'primary' : 'inherit'}
              onClick={handleSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
              className={styles.saveButton}
            >
              {isSaving ? t("Common.Saving") : hasUnsavedChanges ? t("Common.Save") : t("Common.Saved")}
            </Button>
          </Tooltip>
          <Tooltip title={note.isPinned ? t("Notes.Unpin") : t("Notes.Pin")}>
            <IconButton size="small" onClick={handleTogglePin}>
              {note.isPinned ? (
                <PushPinIcon fontSize="small" color="primary" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Common.Delete")}>
            <IconButton size="small" onClick={handleDelete}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Row 3: Tags (mobile only - on desktop tags are in row 2) */}
        {isMobile && (
          <Box className={styles.headerTags}>
            <TagPicker
              selectedTagIds={note.tags}
              onTagsChange={handleTagsChange}
            />
          </Box>
        )}

        {/* Desktop: Tags inline with other actions */}
        {!isMobile && (
          <Box className={styles.headerActions}>
            <TagPicker
              selectedTagIds={note.tags}
              onTagsChange={handleTagsChange}
            />
          </Box>
        )}
      </Box>

      {/* Key forces remount when note changes */}
      <EditorErrorBoundary
        key={note.id}
        fallback={
          <BlockNoteEditor
            initialContent={undefined}
            noteId={note.id}
            onSave={handleSave}
            onChange={handleEditorChange}
            isMobile={isMobile}
            lastSaved={lastSaved}
            lastSavedLabel={t("Notes.LastSaved")}
          />
        }
      >
        <BlockNoteEditor
          initialContent={initialContent}
          noteId={note.id}
          onSave={handleSave}
          onChange={handleEditorChange}
          isMobile={isMobile}
          lastSaved={lastSaved}
          lastSavedLabel={t("Notes.LastSaved")}
        />
      </EditorErrorBoundary>
    </Box>
  );
};
