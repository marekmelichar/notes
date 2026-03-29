import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import dayjs, { type Dayjs } from 'dayjs';
import type { NoteListItem } from '../../types';
import styles from './CalendarView.module.css';

function getWeekdayNames(): string[] {
  const monday = dayjs().startOf('week').add(1, 'day');
  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day').format('dd'));
}

interface CalendarViewProps {
  notes: NoteListItem[];
}

interface DayCell {
  date: Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  notes: NoteListItem[];
}

function buildCalendarGrid(month: Dayjs, notesByDate: Map<string, NoteListItem[]>): DayCell[] {
  const startOfMonth = month.startOf('month');
  const endOfMonth = month.endOf('month');

  // Monday = 1, Sunday = 7 (dayjs with locale)
  const startDay = startOfMonth.day();
  // Adjust so Monday is first: Mon=0, Tue=1, ..., Sun=6
  const offsetFromMonday = startDay === 0 ? 6 : startDay - 1;

  const gridStart = startOfMonth.subtract(offsetFromMonday, 'day');
  const today = dayjs().startOf('day');

  const cells: DayCell[] = [];
  // Always show 6 weeks to keep consistent grid height
  const totalDays = 42;

  for (let i = 0; i < totalDays; i++) {
    const date = gridStart.add(i, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    cells.push({
      date,
      isCurrentMonth: date.isAfter(startOfMonth.subtract(1, 'day')) && date.isBefore(endOfMonth.add(1, 'day')),
      isToday: date.isSame(today, 'day'),
      notes: notesByDate.get(dateKey) || [],
    });
  }

  return cells;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ notes }) => {
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'));
  const navigate = useNavigate();
  const weekdays = useMemo(() => getWeekdayNames(), []);

  const notesByDate = useMemo(() => {
    const map = new Map<string, NoteListItem[]>();
    for (const note of notes) {
      const dateKey = dayjs(note.updatedAt).format('YYYY-MM-DD');
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(note);
      } else {
        map.set(dateKey, [note]);
      }
    }
    return map;
  }, [notes]);

  const grid = useMemo(
    () => buildCalendarGrid(currentMonth, notesByDate),
    [currentMonth, notesByDate],
  );

  const handlePrevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));
  const handleToday = () => setCurrentMonth(dayjs().startOf('month'));

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
  };

  return (
    <Box className={styles.container} data-testid="calendar-view">
      <Box className={styles.header}>
        <Box className={styles.navigation}>
          <IconButton onClick={handlePrevMonth} size="small" data-testid="calendar-prev">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" className={styles.monthTitle}>
            {currentMonth.format('MMMM YYYY')}
          </Typography>
          <IconButton onClick={handleNextMonth} size="small" data-testid="calendar-next">
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <IconButton onClick={handleToday} size="small" title="Today" data-testid="calendar-today">
          <TodayIcon />
        </IconButton>
      </Box>

      <Box className={styles.weekdayRow}>
        {weekdays.map((day) => (
          <Typography key={day} variant="caption" className={styles.weekdayLabel}>
            {day}
          </Typography>
        ))}
      </Box>

      <Box className={styles.grid}>
        {grid.map((cell) => (
          <Box
            key={cell.date.format('YYYY-MM-DD')}
            className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.otherMonth : ''} ${cell.isToday ? styles.today : ''}`}
          >
            <Typography
              variant="caption"
              className={`${styles.dayNumber} ${cell.isToday ? styles.todayNumber : ''}`}
            >
              {cell.date.date()}
            </Typography>
            <Box className={styles.notesList}>
              {cell.notes.slice(0, 3).map((note) => (
                <Chip
                  key={note.id}
                  label={note.title}
                  size="small"
                  onClick={() => handleNoteClick(note.id)}
                  className={styles.noteChip}
                />
              ))}
              {cell.notes.length > 3 && (
                <Typography variant="caption" className={styles.moreCount}>
                  +{cell.notes.length - 3} more
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
