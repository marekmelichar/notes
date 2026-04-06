import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store';
import { loadNotes, resetFilter, selectAllNotes } from '@/features/notes/store/notesSlice';
import { CalendarView } from '@/features/notes/components/CalendarView';
import styles from './index.module.css';

const CalendarPage = () => {
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectAllNotes);

  useEffect(() => {
    dispatch(resetFilter());
    dispatch(loadNotes());
  }, [dispatch]);

  return (
    <Box className={styles.container}>
      <CalendarView notes={notes} />
    </Box>
  );
};

export default CalendarPage;
