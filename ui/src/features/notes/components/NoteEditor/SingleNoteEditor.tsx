import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/store/notificationsSlice';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAutoSave, useScrollDirection } from '@/hooks';
import { setTabUnsaved } from '@/store/tabsSlice';
import {
  selectNoteById,
  updateNote,
  deleteNote,
  restoreNote,
} from '../../store/notesSlice';
import { selectAllFolders } from '../../store/foldersSlice';
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type EditorStats,
  type ExportFormat,
} from './TiptapEditor';
import { EditorHeader } from './EditorHeader';
import { EditorFooter } from './EditorFooter';
import { migrateContent } from './contentMigration';
import styles from './index.module.css';

interface SingleNoteEditorProps {
  noteId: string;
  isActive: boolean;
}

export const SingleNoteEditor = ({ noteId, isActive }: SingleNoteEditorProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const note = useAppSelector((state) => selectNoteById(state, noteId));
  const folders = useAppSelector(selectAllFolders);
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const [title, setTitle] = useState(note?.title || '');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [viewMode, setViewMode] = useState<'editor' | 'markdown'>('editor');
  const [stats, setStats] = useState<EditorStats>({ wordCount: 0, charCount: 0 });

  // Editor ref for content access and export
  const editorRef = useRef<TiptapEditorHandle>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useScrollDirection(editorScrollRef);

  // Track the last saved values
  const lastSavedContentRef = useRef<string>(note?.content || '');
  const lastSavedTitleRef = useRef<string>(note?.title || '');
  const titleRef = useRef(title);
  titleRef.current = title;

  // markClean ref to break circular dep: performSave needs markClean, useAutoSave needs performSave
  const markCleanRef = useRef<() => void>(() => {});

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    if (!note || isSavingRef.current) return;

    const content = editorRef.current ? await editorRef.current.getContent() : '[]';
    const currentTitle = titleRef.current;
    const updates: { content?: string; title?: string } = {};

    const hasContentChanged = content !== lastSavedContentRef.current;
    const hasTitleChanged = currentTitle !== lastSavedTitleRef.current;

    const previousContent = lastSavedContentRef.current;
    const previousTitle = lastSavedTitleRef.current;

    if (hasContentChanged) {
      updates.content = content;
      lastSavedContentRef.current = content;
    }
    if (hasTitleChanged) {
      updates.title = currentTitle;
      lastSavedTitleRef.current = currentTitle;
    }

    if (hasContentChanged || hasTitleChanged) {
      isSavingRef.current = true;
      setIsSaving(true);
      try {
        await dispatch(updateNote({ id: note.id, updates })).unwrap();
        setLastSaved(new Date());
        markCleanRef.current();
      } catch {
        lastSavedContentRef.current = previousContent;
        lastSavedTitleRef.current = previousTitle;
        dispatch(showError(t('Notes.SaveError')));
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }
  }, [note, dispatch, t]);

  const {
    hasUnsavedChanges,
    hasUnsavedChangesRef,
    autoSaveCountdown,
    markDirty,
    markClean,
    saveNow,
    flush,
  } = useAutoSave({
    delayMs: 10_000,
    onSave: performSave,
  });
  markCleanRef.current = markClean;

  // Update title when note changes externally
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      lastSavedContentRef.current = note.content || '';
      lastSavedTitleRef.current = note.title || '';
      markClean();
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get initial content for the editor
  const initialContent = useMemo(() => {
    return migrateContent(note?.content);
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture initial stats after editor mounts
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (editorRef.current) {
        setStats(editorRef.current.getStats());
      }
    });
    return () => cancelAnimationFrame(id);
  }, [noteId]);

  // Report unsaved changes to tabsSlice
  useEffect(() => {
    dispatch(setTabUnsaved({ id: noteId, hasUnsavedChanges }));
  }, [dispatch, noteId, hasUnsavedChanges]);

  const handleEditorChange = useCallback(() => {
    markDirty();
    if (editorRef.current) {
      setStats(editorRef.current.getStats());
    }
  }, [markDirty]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    markDirty();
  }, [markDirty]);

  // Keyboard shortcut for save (Ctrl/Cmd + S) — only when active
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveNow, isActive]);

  // Warn about unsaved changes on tab close; best-effort save on unmount.
  // Note: flush() fires an async save that may not complete before teardown.
  // The beforeunload warning is the primary protection against data loss.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [flush, hasUnsavedChangesRef]);

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
      dispatch(showSuccess(t('Notes.NoteRestored')));
    }
  }, [note, dispatch, t]);

  const handleFolderChange = useCallback(
    (folderId: string | null) => {
      if (note) {
        dispatch(updateNote({ id: note.id, updates: { folderId: folderId ?? '' } }));
      }
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
      if (!editorRef.current || !note) return;

      try {
        const { blob } = await editorRef.current.exportTo(format, note.title);
        const ext = format === 'markdown' ? 'md' : format;
        const safeTitle = (note.title || t('Common.Untitled')).replace(/[/\\:*?"<>|]/g, '-');
        const filename = `${safeTitle}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        dispatch(showSuccess(t('Export.Success')));
      } catch {
        dispatch(showError(t('Export.Error')));
      }
    },
    [note, t, dispatch],
  );

  if (!note) {
    return null;
  }

  return (
    <Box
      className={`${styles.editorContainer} ${!isActive ? styles.editorHidden : ''}`}
    >
      <EditorHeader
        note={note}
        title={title}
        onTitleChange={handleTitleChange}
        isMobile={isMobile}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        folders={folders}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={saveNow}
        onTogglePin={handleTogglePin}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onFolderChange={handleFolderChange}
        onTagsChange={handleTagsChange}
        onExport={handleExport}
      />

      {/* Key forces remount when note changes */}
      <ErrorBoundary
        key={note.id}
        fallback={
          <TiptapEditor
            initialContent={undefined}
            noteId={note.id}
            onChange={handleEditorChange}
            viewMode={viewMode}
          />
        }
      >
        <TiptapEditor
          ref={editorRef}
          initialContent={initialContent}
          noteId={note.id}
          onChange={handleEditorChange}
          viewMode={viewMode}
          scrollRef={editorScrollRef}
        />
      </ErrorBoundary>

      <EditorFooter
        wordCount={stats.wordCount}
        charCount={stats.charCount}
        autoSaveCountdown={autoSaveCountdown}
        autoSaveLabel={t('Notes.AutoSaveIn')}
        lastSaved={lastSaved}
        lastSavedLabel={t('Notes.LastSaved')}
      />
    </Box>
  );
};
