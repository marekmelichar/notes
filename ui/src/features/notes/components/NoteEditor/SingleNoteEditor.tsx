import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Box, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/store/notificationsSlice';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAutoSave, useScrollDirection } from '@/hooks';
import { setTabUnsaved } from '@/store/tabsSlice';
import {
  selectNoteDetail,
  selectNoteConflict,
  updateNote,
  deleteNote,
  restoreNote,
} from '../../store/notesSlice';
import { selectFoldersSortedByName } from '../../store/foldersSlice';
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type EditorStats,
  type ExportFormat,
} from './TiptapEditor';
import { EditorHeader } from './EditorHeader';
import { EditorFooter } from './EditorFooter';
import { EditorErrorFallback } from './EditorErrorFallback';
import { migrateContent } from './contentMigration';
import type { EditorSaveHandle } from '../EditorPanel';
import styles from './index.module.css';

interface SingleNoteEditorProps {
  noteId: string;
  isActive: boolean;
  saveRef?: (handle: EditorSaveHandle | null) => void;
}

export const SingleNoteEditor = ({ noteId, isActive, saveRef }: SingleNoteEditorProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const note = useAppSelector((state) => selectNoteDetail(state, noteId));
  const conflictMessage = useAppSelector((state) => selectNoteConflict(state, noteId));
  const folders = useAppSelector(selectFoldersSortedByName);
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const [title, setTitle] = useState(note?.title || '');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [stats, setStats] = useState<EditorStats>({ wordCount: 0, charCount: 0 });

  // Editor ref for content access and export
  const editorRef = useRef<TiptapEditorHandle>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useScrollDirection(editorScrollRef);

  // Last-saved baselines. `null` means "not hydrated yet" — the editor hasn't
  // had server content applied, so any "current content" read is a stale
  // ghost-tab snapshot. See 2026-04-23 incident + ADR 0009.
  const lastSavedContentRef = useRef<string | null>(null);
  const lastSavedTitleRef = useRef<string | null>(null);
  // Which note id's baseline is currently loaded in the editor.
  const hydratedNoteIdRef = useRef<string | null>(null);
  // True if the note had non-empty content when we hydrated. An empty save is
  // only legitimate if baseline was ever non-empty for this note.
  const baselineEverNonEmptyRef = useRef<boolean>(false);
  const titleRef = useRef(title);
  titleRef.current = title;

  // markClean ref to break circular dep: performSave needs markClean, useAutoSave needs performSave
  const markCleanRef = useRef<() => void>(() => {});

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    // Guard against stale / ghost-tab saves that could wipe server content.
    // See docs/adr/0009-optimistic-concurrency-on-note-put.md.
    if (!note || isSavingRef.current) return;
    // (a) Note isn't loaded / (b) editor not yet hydrated for THIS note.
    if (
      hydratedNoteIdRef.current !== note.id ||
      lastSavedContentRef.current === null ||
      lastSavedTitleRef.current === null
    ) {
      return;
    }
    // Conflict detected from a previous save — user must reload to continue.
    if (conflictMessage) return;

    const content = editorRef.current ? await editorRef.current.getContent() : '[]';
    const currentTitle = titleRef.current;
    const updates: { content?: string; title?: string } = {};

    const previousContent = lastSavedContentRef.current;
    const previousTitle = lastSavedTitleRef.current;

    const hasContentChanged = content !== previousContent;
    const hasTitleChanged = currentTitle !== previousTitle;

    // (c) Reject a save where the editor went from "baseline never non-empty"
    // to "still empty" — this is the ghost-tab wipe signature.
    const editorIsEmpty = editorRef.current?.isEmpty() ?? true;
    if (
      hasContentChanged &&
      editorIsEmpty &&
      !baselineEverNonEmptyRef.current
    ) {
      return;
    }

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
        // After a content save succeeds, the baseline is now definitely
        // non-empty-or-empty-by-intent — flip the flag so future edits can
        // save an empty doc (legitimate content deletion).
        if (hasContentChanged) {
          baselineEverNonEmptyRef.current = true;
        }
        markCleanRef.current();
      } catch {
        lastSavedContentRef.current = previousContent;
        lastSavedTitleRef.current = previousTitle;
        // The thunk already surfaces a user-visible snackbar (including the
        // 409 "conflict" detail); no duplicate showError here.
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }
  }, [note, conflictMessage, dispatch]);

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

  // Expose imperative save handle to parent (EditorPanel)
  useEffect(() => {
    if (saveRef) {
      saveRef({
        saveNow: async () => {
          if (hasUnsavedChangesRef.current) {
            await performSave();
          }
        },
      });
      return () => saveRef(null);
    }
  }, [saveRef, performSave, hasUnsavedChangesRef]);

  // Hydrate the baseline when the note loads (or the noteId changes).
  // Flipping hydratedNoteIdRef is the signal that lastSavedContentRef now
  // reflects server state and subsequent saves are safe to dispatch.
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      lastSavedContentRef.current = note.content || '';
      lastSavedTitleRef.current = note.title || '';
      hydratedNoteIdRef.current = note.id;
      baselineEverNonEmptyRef.current = (note.content || '').length > 0;
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
    }
  }, [note, dispatch]);

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

      {conflictMessage && (
        <Alert severity="warning" data-testid="note-conflict-banner" sx={{ m: 1 }}>
          {conflictMessage}
        </Alert>
      )}

      <ErrorBoundary
        key={note.id}
        fallback={<EditorErrorFallback />}
      >
        <TiptapEditor
          ref={editorRef}
          initialContent={initialContent}
          noteId={note.id}
          onChange={handleEditorChange}
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
