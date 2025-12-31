import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useAppDispatch } from '@/store';
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

  return (
    <Box className={styles.container}>
      <Box className={styles.sidebar}>
        <NotesSidebar />
      </Box>
      <Box className={styles.noteList}>
        <NoteList />
      </Box>
      <Box className={styles.editor}>
        <NoteEditor />
      </Box>
    </Box>
  );
};

export default NotesPage;
