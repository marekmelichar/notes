import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector, setMobileView, setSidebarCollapsed } from '@/store';
import { loadNotes, selectSelectedNote } from '@/features/notes/store/notesSlice';
import { loadFolders } from '@/features/notes/store/foldersSlice';
import { loadTags } from '@/features/notes/store/tagsSlice';
import { checkPendingChanges, setOnlineStatus } from '@/features/notes/store/syncSlice';
import { NotesSidebar } from '@/features/notes/components/NotesSidebar';
import { NoteList } from '@/features/notes/components/NoteList';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import styles from './index.module.css';

const DEFAULT_TITLE = 'epoznamky - Note Taking App';

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const NOTELIST_WIDTH = 350;
const NOTELIST_COLLAPSED_WIDTH = 60;
const STORAGE_KEY = 'notes-sidebar-width';
const MEDIUM_BREAKPOINT = 1024;

const NotesPage = () => {
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const mobileView = useAppSelector((state) => state.ui.mobileView);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const noteListCollapsed = useAppSelector((state) => state.ui.noteListCollapsed);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const selectedNote = useAppSelector(selectSelectedNote);

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  });

  // Auto-collapse sidebar at medium breakpoint
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Auto-collapse when entering medium breakpoint, auto-expand when leaving
      if (width <= MEDIUM_BREAKPOINT && width > 768 && !sidebarCollapsed) {
        dispatch(setSidebarCollapsed(true));
      }
    };

    // Check on mount
    if (window.innerWidth <= MEDIUM_BREAKPOINT && window.innerWidth > 768) {
      dispatch(setSidebarCollapsed(true));
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, sidebarCollapsed]);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    dispatch(loadNotes());
    dispatch(loadFolders());
    dispatch(loadTags());
    dispatch(checkPendingChanges());
  }, [dispatch]);

  // Track online status
  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // Update page title based on selected note
  useEffect(() => {
    if (selectedNote?.title) {
      document.title = `${selectedNote.title} - epoznamky`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [selectedNote?.title]);

  // Track previous selected note to detect new selections
  const prevSelectedNoteId = useRef<string | null>(null);

  // Switch to editor view only when a NEW note is selected on mobile
  useEffect(() => {
    const isNewSelection = selectedNoteId && selectedNoteId !== prevSelectedNoteId.current;
    if (isMobile && isNewSelection && mobileView === 'list') {
      dispatch(setMobileView('editor'));
    }
    prevSelectedNoteId.current = selectedNoteId;
  }, [dispatch, isMobile, selectedNoteId, mobileView]);

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

    setSidebarWidth(clampedWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);

  // Attach global mouse events for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Helper to get panel visibility class
  const getPanelClass = (panel: 'sidebar' | 'list' | 'editor') => {
    if (!isMobile) return '';
    return mobileView === panel ? styles.mobileVisible : styles.mobileHidden;
  };

  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
  const effectiveNoteListWidth = noteListCollapsed ? NOTELIST_COLLAPSED_WIDTH : NOTELIST_WIDTH;
  const gridStyle = isMobile
    ? undefined
    : { gridTemplateColumns: `${effectiveSidebarWidth}px ${effectiveNoteListWidth}px 1fr` };

  return (
    <Box ref={containerRef} className={styles.container} style={gridStyle}>
      <Box className={`${styles.sidebar} ${getPanelClass('sidebar')} ${sidebarCollapsed && !isMobile ? styles.sidebarCollapsed : ''}`}>
        <NotesSidebar collapsed={sidebarCollapsed && !isMobile} />
      </Box>
      {!isMobile && !sidebarCollapsed && (
        <Box
          className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
          style={{ left: sidebarWidth - 2 }}
          onMouseDown={handleResizeStart}
        />
      )}
      <Box className={`${styles.noteList} ${getPanelClass('list')} ${noteListCollapsed ? styles.noteListCollapsed : ''}`}>
        <NoteList collapsed={noteListCollapsed} />
      </Box>
      <Box className={`${styles.editor} ${getPanelClass('editor')}`}>
        <NoteEditor />
      </Box>
    </Box>
  );
};

export default NotesPage;
