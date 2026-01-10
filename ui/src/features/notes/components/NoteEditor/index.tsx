import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Box, IconButton, Typography, Tooltip, Chip, Menu, MenuItem, ListItemIcon, ListItemText, Button, CircularProgress } from '@mui/material';
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
import {
  updateNote,
  deleteNote,
  selectSelectedNote,
} from '../../store/notesSlice';
import { selectTagsByIds } from '../../store/tagsSlice';
import { selectAllFolders } from '../../store/foldersSlice';
import styles from './index.module.css';

// Parse content from storage - handles both BlockNote and legacy TipTap formats
function parseContent(content: string | undefined): PartialBlock[] | undefined {
  if (!content) return undefined;

  try {
    const parsed = JSON.parse(content);

    // Check if it's BlockNote format (array of blocks)
    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Legacy TipTap format - return undefined to start fresh
    // User will need to re-enter content or we can add migration later
    if (parsed.type === 'doc' && parsed.content) {
      return undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export const NoteEditor = () => {
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectSelectedNote);
  const folders = useAppSelector(selectAllFolders);
  const tags = useAppSelector((state) => (note ? selectTagsByIds(note.tags)(state) : []));
  const [title, setTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null | HTMLElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track which note we're currently editing
  const currentNoteIdRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');

  // Get initial content for the editor
  const initialContent = useMemo(() => {
    return parseContent(note?.content);
  }, [note?.id]); // Only recalculate when note ID changes

  // Create BlockNote editor
  const editor = useCreateBlockNote({
    initialContent,
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note) {
      // Update tracking refs
      currentNoteIdRef.current = note.id;
      lastSavedContentRef.current = note.content || '';
      lastSavedTitleRef.current = note.title || '';

      // Set editor content
      const blocks = parseContent(note.content);
      if (blocks) {
        editor.replaceBlocks(editor.document, blocks);
      } else {
        // Clear editor for new note or legacy content
        editor.replaceBlocks(editor.document, []);
      }

      setTitle(note.title || '');
      setHasUnsavedChanges(false);
    } else if (editor && !note) {
      currentNoteIdRef.current = null;
      editor.replaceBlocks(editor.document, []);
      setTitle('');
      setHasUnsavedChanges(false);
    }
  }, [editor, note?.id, note?.content, note?.title]);

  // Handle editor changes
  const handleEditorChange = useCallback(() => {
    if (!note) return;
    const content = JSON.stringify(editor.document);
    const hasContentChanged = content !== lastSavedContentRef.current;
    setHasUnsavedChanges(hasContentChanged || title !== lastSavedTitleRef.current);
  }, [editor, note, title]);

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
    if (!note || !editor || isSaving) return;

    const content = JSON.stringify(editor.document);
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
  }, [note, editor, title, dispatch, isSaving]);

  // Keyboard shortcut for save (Ctrl/Cmd + S)
  useEffect(() => {
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
      // Send empty string to API to clear folder (null means "don't change" in the API)
      dispatch(updateNote({ id: note.id, updates: { folderId: folderId ?? '' } }));
    }
    setFolderMenuAnchor(null);
  }, [note, dispatch]);

  const currentFolder = folders.find(f => f.id === note?.folderId);

  if (!note) {
    return (
      <Box className={styles.emptyState}>
        <NoteOutlinedIcon className={styles.emptyStateIcon} />
        <Typography variant="h6">Select a note or create a new one</Typography>
        <Typography variant="body2">
          Your notes will appear here when you select them from the list
        </Typography>
      </Box>
    );
  }

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

  return (
    <Box className={styles.editorContainer}>
      <Box className={styles.header}>
        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
        />
        <Box className={styles.headerActions}>
          <Tooltip title="Move to folder">
            <Chip
              icon={<FolderIcon fontSize="small" />}
              label={currentFolder?.name || 'No folder'}
              size="small"
              variant="outlined"
              onClick={handleFolderMenuOpen}
              sx={{ cursor: 'pointer' }}
            />
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
              <ListItemText>No folder</ListItemText>
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
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              sx={{ backgroundColor: tag.color, color: 'white' }}
            />
          ))}
          <Tooltip title="Save (Ctrl+S)">
            <Button
              size="small"
              variant={hasUnsavedChanges ? 'contained' : 'outlined'}
              color={hasUnsavedChanges ? 'primary' : 'inherit'}
              onClick={handleSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
              sx={{ minWidth: 'auto', px: 1.5 }}
            >
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
            </Button>
          </Tooltip>
          <Tooltip title={note.isPinned ? 'Unpin' : 'Pin'}>
            <IconButton size="small" onClick={handleTogglePin}>
              {note.isPinned ? (
                <PushPinIcon fontSize="small" color="primary" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={handleDelete}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box className={styles.editorContent}>
        <BlockNoteView
          editor={editor}
          theme="dark"
          onChange={handleEditorChange}
        />
      </Box>

      <Box className={styles.footer}>
        <Typography variant="caption">
          {wordCount} words | {charCount} characters
        </Typography>
        {lastSaved && (
          <Typography variant="caption">
            Last saved: {lastSaved.toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
