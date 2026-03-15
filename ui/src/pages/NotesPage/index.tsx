import React, { useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector, setMobileView, setSidebarCollapsed, openTab, selectActiveTabId, selectIsMobile, selectMobileView, selectSidebarCollapsed, selectNoteListCollapsed, selectNoteListHidden } from '@/store';
import { loadNotes, selectAllNotes } from '@/features/notes/store/notesSlice';
import { loadFolders } from '@/features/notes/store/foldersSlice';
import { loadTags } from '@/features/notes/store/tagsSlice';
import { MOBILE_BREAKPOINT, MEDIUM_BREAKPOINT } from '@/config';
import { useResizablePanel } from '@/hooks';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NotesSidebar } from '@/features/notes/components/NotesSidebar';
import { NoteList } from '@/features/notes/components/NoteList';
import { EditorPanel } from '@/features/notes/components/EditorPanel';
import styles from './index.module.css';

const DEFAULT_TITLE = 'notes';

const SIDEBAR_COLLAPSED_WIDTH = 60;
const NOTELIST_COLLAPSED_WIDTH = 60;

const NotesPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { noteId: urlNoteId } = useParams<{ noteId: string }>();
  const isMobile = useAppSelector(selectIsMobile);
  const mobileView = useAppSelector(selectMobileView);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const noteListCollapsed = useAppSelector(selectNoteListCollapsed);
  const noteListHidden = useAppSelector(selectNoteListHidden);
  const activeTabId = useAppSelector(selectActiveTabId);
  const notes = useAppSelector(selectAllNotes);
  const activeNote = useMemo(
    () => (activeTabId ? notes.find((n) => n.id === activeTabId) ?? null : null),
    [notes, activeTabId],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Resizable panels
  const sidebar = useResizablePanel(containerRef, {
    storageKey: 'notes-sidebar-width',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 800,
  });

  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebar.width;

  const noteList = useResizablePanel(containerRef, {
    storageKey: 'notes-notelist-width',
    defaultWidth: 350,
    minWidth: 200,
    maxWidth: 600,
    offsetLeft: effectiveSidebarWidth,
  });

  // Bidirectional sync: URL ↔ Redux active tab
  const prevUrlNoteId = useRef(urlNoteId);
  const prevActiveTabId = useRef(activeTabId);

  useEffect(() => {
    const urlChanged = urlNoteId !== prevUrlNoteId.current;
    const tabChanged = activeTabId !== prevActiveTabId.current;

    if (urlChanged && urlNoteId && urlNoteId !== activeTabId) {
      dispatch(openTab(urlNoteId));
    } else if (tabChanged) {
      if (activeTabId && activeTabId !== urlNoteId) {
        navigate(`/notes/${activeTabId}`, { replace: true });
      } else if (!activeTabId && urlNoteId) {
        navigate('/', { replace: true });
      }
    }

    prevUrlNoteId.current = urlNoteId;
    prevActiveTabId.current = activeTabId;
  }, [urlNoteId, activeTabId, dispatch, navigate]);

  // Auto-collapse sidebar at medium breakpoint
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= MEDIUM_BREAKPOINT && width > MOBILE_BREAKPOINT && !sidebarCollapsed) {
        dispatch(setSidebarCollapsed(true));
      }
    };

    if (window.innerWidth <= MEDIUM_BREAKPOINT && window.innerWidth > MOBILE_BREAKPOINT) {
      dispatch(setSidebarCollapsed(true));
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch, sidebarCollapsed]);

  // Load data on mount
  useEffect(() => {
    dispatch(loadNotes());
    dispatch(loadFolders());
    dispatch(loadTags());
  }, [dispatch]);

  // Update page title based on active tab's note
  useEffect(() => {
    if (activeNote?.title) {
      document.title = `${activeNote.title} - notes`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [activeNote?.title]);

  // Switch to editor view only when a NEW tab is activated on mobile
  const prevMobileTabId = useRef<string | null>(null);
  useEffect(() => {
    const isNewSelection = activeTabId && activeTabId !== prevMobileTabId.current;
    if (isMobile && isNewSelection && mobileView === 'list') {
      dispatch(setMobileView('editor'));
    }
    prevMobileTabId.current = activeTabId;
  }, [dispatch, isMobile, activeTabId, mobileView]);

  // Helper to get panel visibility class
  const getPanelClass = (panel: 'sidebar' | 'list' | 'editor') => {
    if (!isMobile) return '';
    return mobileView === panel ? styles.mobileVisible : styles.mobileHidden;
  };

  const effectiveNoteListWidth = noteListCollapsed ? NOTELIST_COLLAPSED_WIDTH : noteList.width;
  const gridStyle = isMobile
    ? undefined
    : noteListHidden
      ? { gridTemplateColumns: `${effectiveSidebarWidth}px 1fr` }
      : { gridTemplateColumns: `${effectiveSidebarWidth}px ${effectiveNoteListWidth}px 1fr` };

  return (
    <Box ref={containerRef} className={styles.container} style={gridStyle}>
      <ErrorBoundary>
        <Box className={`${styles.sidebar} ${getPanelClass('sidebar')} ${sidebarCollapsed && !isMobile ? styles.sidebarCollapsed : ''}`}>
          <NotesSidebar collapsed={sidebarCollapsed && !isMobile} />
        </Box>
      </ErrorBoundary>
      {!isMobile && !sidebarCollapsed && (
        <Box
          className={`${styles.resizeHandle} ${sidebar.isResizing ? styles.resizeHandleActive : ''}`}
          style={{ left: effectiveSidebarWidth - 2 }}
          onMouseDown={sidebar.onResizeStart}
        />
      )}
      {!(noteListHidden && !isMobile) && (
        <ErrorBoundary>
          <Box className={`${styles.noteList} ${getPanelClass('list')} ${noteListCollapsed ? styles.noteListCollapsed : ''}`}>
            <NoteList collapsed={noteListCollapsed} />
          </Box>
        </ErrorBoundary>
      )}
      {!isMobile && !noteListCollapsed && !noteListHidden && (
        <Box
          className={`${styles.resizeHandle} ${noteList.isResizing ? styles.resizeHandleActive : ''}`}
          style={{ left: effectiveSidebarWidth + effectiveNoteListWidth - 2 }}
          onMouseDown={noteList.onResizeStart}
        />
      )}
      <ErrorBoundary>
        <Box className={`${styles.editor} ${getPanelClass('editor')}`}>
          <EditorPanel />
        </Box>
      </ErrorBoundary>
    </Box>
  );
};

export default NotesPage;
