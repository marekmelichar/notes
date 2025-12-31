import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Note, Tag } from '../../types';
import styles from './index.module.css';

dayjs.extend(relativeTime);

interface NoteCardProps {
  note: Note;
  tags: Tag[];
  isSelected: boolean;
  onClick: () => void;
}

const stripHtmlTags = (html: string): string => {
  try {
    const parsed = JSON.parse(html);
    const extractText = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';
      const n = node as { type?: string; text?: string; content?: unknown[] };
      if (n.type === 'text' && n.text) return n.text;
      if (n.content && Array.isArray(n.content)) {
        return n.content.map(extractText).join(' ');
      }
      return '';
    };
    return extractText(parsed);
  } catch {
    return html.replace(/<[^>]*>/g, '');
  }
};

export const NoteCard = ({ note, tags, isSelected, onClick }: NoteCardProps) => {
  const contentPreview = stripHtmlTags(note.content).slice(0, 150);

  return (
    <Box
      className={`${styles.noteCard} ${isSelected ? styles.noteCardSelected : ''} ${
        note.isPinned ? styles.noteCardPinned : ''
      }`}
      onClick={onClick}
    >
      <Box className={styles.noteCardHeader}>
        <Typography className={styles.noteCardTitle}>
          {note.title || 'Untitled'}
        </Typography>
        {note.isPinned && (
          <Tooltip title="Pinned">
            <PushPinIcon fontSize="small" color="primary" />
          </Tooltip>
        )}
      </Box>

      {contentPreview && (
        <Typography className={styles.noteCardContent}>
          {contentPreview}
        </Typography>
      )}

      <Box className={styles.noteCardFooter}>
        <Typography variant="caption">
          {dayjs(note.updatedAt).fromNow()}
        </Typography>
        <Box className={styles.noteCardTags}>
          {tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: tag.color,
                color: 'white',
              }}
            />
          ))}
          {tags.length > 3 && (
            <Chip
              label={`+${tags.length - 3}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
