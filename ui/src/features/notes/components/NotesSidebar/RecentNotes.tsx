import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, Collapse } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Note } from '../../types';
import styles from './index.module.css';

const RECENT_STORAGE_KEY = 'notes-recent-height';
const RECENT_MIN_HEIGHT = 60;
const RECENT_MAX_HEIGHT = 500;
const RECENT_DEFAULT_HEIGHT = 180;

interface RecentNotesProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
}

export const RecentNotes = ({ notes, selectedNoteId, onSelectNote }: RecentNotesProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem(RECENT_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : RECENT_DEFAULT_HEIGHT;
  });
  const [resizing, setResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const heightRef = useRef(height);
  heightRef.current = height;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    startY.current = e.clientY;
    startHeight.current = heightRef.current;
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY.current;
      const newHeight = Math.min(Math.max(startHeight.current + delta, RECENT_MIN_HEIGHT), RECENT_MAX_HEIGHT);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      localStorage.setItem(RECENT_STORAGE_KEY, heightRef.current.toString());
      setResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  return (
    <Box className={styles.section}>
      <Box className={styles.sectionHeader}>
        <Typography className={styles.sectionTitle}>{t('Notes.Recent')}</Typography>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box className={styles.recentList} style={{ maxHeight: height }}>
          {notes.map((note) => (
            <Box
              key={note.id}
              className={`${styles.navItem} ${selectedNoteId === note.id ? styles.navItemActive : ''}`}
              onClick={() => onSelectNote(note.id)}
            >
              <AccessTimeIcon fontSize="small" className={styles.navItemIcon} />
              <Typography className={styles.navItemLabel} noWrap>
                {note.title || t('Common.Untitled')}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          className={`${styles.verticalResizeHandle} ${resizing ? styles.verticalResizeHandleActive : ''}`}
          onMouseDown={handleResizeStart}
        />
      </Collapse>
    </Box>
  );
};
