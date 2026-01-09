import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector, setMobileView } from '@/store';
import { loadNotes } from '@/features/notes/store/notesSlice';
import { loadFolders } from '@/features/notes/store/foldersSlice';
import { loadTags } from '@/features/notes/store/tagsSlice';
import { checkPendingChanges, setOnlineStatus } from '@/features/notes/store/syncSlice';
import { NotesSidebar } from '@/features/notes/components/NotesSidebar';
import { NoteList } from '@/features/notes/components/NoteList';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import styles from './index.module.css';

const NotesPage = () => {
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const mobileView = useAppSelector((state) => state.ui.mobileView);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);

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

  // Switch to editor view when a note is selected on mobile
  useEffect(() => {
    if (isMobile && selectedNoteId && mobileView === 'list') {
      dispatch(setMobileView('editor'));
    }
  }, [dispatch, isMobile, selectedNoteId, mobileView]);

  // Helper to get panel visibility class
  const getPanelClass = (panel: 'sidebar' | 'list' | 'editor') => {
    if (!isMobile) return '';
    return mobileView === panel ? styles.mobileVisible : styles.mobileHidden;
  };

  return (
    <Box className={styles.container}>
      <Box className={`${styles.sidebar} ${getPanelClass('sidebar')}`}>
        <NotesSidebar />
      </Box>
      <Box className={`${styles.noteList} ${getPanelClass('list')}`}>
        <NoteList />
      </Box>
      <Box className={`${styles.editor} ${getPanelClass('editor')}`}>
        <NoteEditor />
      </Box>
    </Box>
  );
};

export default NotesPage;
