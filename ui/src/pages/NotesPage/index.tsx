import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector, setMobileView, setSidebarCollapsed } from '@/store';
import { loadNotes, selectSelectedNote, setSelectedNote } from '@/features/notes/store/notesSlice';
import { loadFolders } from '@/features/notes/store/foldersSlice';
import { loadTags } from '@/features/notes/store/tagsSlice';
import { checkPendingChanges, setOnlineStatus } from '@/features/notes/store/syncSlice';
import { NotesSidebar } from '@/features/notes/components/NotesSidebar';
import { NoteList } from '@/features/notes/components/NoteList';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import styles from './index.module.css';

const DEFAULT_TITLE = 'epoznamky - Note Taking App';

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 800;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const NOTELIST_MIN_WIDTH = 200;
const NOTELIST_MAX_WIDTH = 600;
const NOTELIST_DEFAULT_WIDTH = 350;
const NOTELIST_COLLAPSED_WIDTH = 60;
const SIDEBAR_STORAGE_KEY = 'notes-sidebar-width';
const NOTELIST_STORAGE_KEY = 'notes-notelist-width';
const MEDIUM_BREAKPOINT = 1024;

const NotesPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { noteId: urlNoteId } = useParams<{ noteId: string }>();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const mobileView = useAppSelector((state) => state.ui.mobileView);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const noteListCollapsed = useAppSelector((state) => state.ui.noteListCollapsed);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const selectedNote = useAppSelector(selectSelectedNote);

  // Sync URL → Redux: set selected note from URL on mount
  const urlSyncRef = useRef(false);
  useEffect(() => {
    if (urlNoteId && urlNoteId !== selectedNoteId) {
      urlSyncRef.current = true;
      dispatch(setSelectedNote(urlNoteId));
    }
  }, [urlNoteId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync Redux → URL: update URL when selected note changes
  useEffect(() => {
    if (urlSyncRef.current) {
      urlSyncRef.current = false;
      return;
    }
    if (selectedNoteId && selectedNoteId !== urlNoteId) {
      navigate(`/notes/${selectedNoteId}`, { replace: true });
    } else if (!selectedNoteId && urlNoteId) {
      navigate('/', { replace: true });
    }
  }, [selectedNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [noteListWidth, setNoteListWidth] = useState(() => {
    const saved = localStorage.getItem(NOTELIST_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : NOTELIST_DEFAULT_WIDTH;
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
  const [resizingPanel, setResizingPanel] = useState<'sidebar' | 'notelist' | null>(null);
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

  // Resize handlers
  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingPanel('sidebar');
  }, []);

  const handleNoteListResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingPanel('notelist');
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingPanel || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;

    if (resizingPanel === 'sidebar') {
      const clampedWidth = Math.min(Math.max(x, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
      setSidebarWidth(clampedWidth);
    } else {
      const currentSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
      const newWidth = x - currentSidebarWidth;
      const clampedWidth = Math.min(Math.max(newWidth, NOTELIST_MIN_WIDTH), NOTELIST_MAX_WIDTH);
      setNoteListWidth(clampedWidth);
    }
  }, [resizingPanel, sidebarCollapsed, sidebarWidth]);

  const handleResizeEnd = useCallback(() => {
    if (resizingPanel === 'sidebar') {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarWidth.toString());
    } else if (resizingPanel === 'notelist') {
      localStorage.setItem(NOTELIST_STORAGE_KEY, noteListWidth.toString());
    }
    setResizingPanel(null);
  }, [resizingPanel, sidebarWidth, noteListWidth]);

  // Attach global mouse events for resize
  useEffect(() => {
    if (resizingPanel) {
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
  }, [resizingPanel, handleResizeMove, handleResizeEnd]);

  // Helper to get panel visibility class
  const getPanelClass = (panel: 'sidebar' | 'list' | 'editor') => {
    if (!isMobile) return '';
    return mobileView === panel ? styles.mobileVisible : styles.mobileHidden;
  };

  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
  const effectiveNoteListWidth = noteListCollapsed ? NOTELIST_COLLAPSED_WIDTH : noteListWidth;
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
          className={`${styles.resizeHandle} ${resizingPanel === 'sidebar' ? styles.resizeHandleActive : ''}`}
          style={{ left: effectiveSidebarWidth - 2 }}
          onMouseDown={handleSidebarResizeStart}
        />
      )}
      <Box className={`${styles.noteList} ${getPanelClass('list')} ${noteListCollapsed ? styles.noteListCollapsed : ''}`}>
        <NoteList collapsed={noteListCollapsed} />
      </Box>
      {!isMobile && !noteListCollapsed && (
        <Box
          className={`${styles.resizeHandle} ${resizingPanel === 'notelist' ? styles.resizeHandleActive : ''}`}
          style={{ left: effectiveSidebarWidth + effectiveNoteListWidth - 2 }}
          onMouseDown={handleNoteListResizeStart}
        />
      )}
      <Box className={`${styles.editor} ${getPanelClass('editor')}`}>
        <NoteEditor />
      </Box>
    </Box>
  );
};

export default NotesPage;
