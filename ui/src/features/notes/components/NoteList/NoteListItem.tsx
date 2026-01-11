import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PushPinIcon from '@mui/icons-material/PushPin';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Note, Tag } from '../../types';
import styles from './index.module.css';

dayjs.extend(relativeTime);

interface NoteListItemProps {
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

export const NoteListItem = ({ note, tags, isSelected, onClick }: NoteListItemProps) => {
  const { t } = useTranslation();
  const contentPreview = stripHtmlTags(note.content).slice(0, 80);

  return (
    <Box
      className={`${styles.noteListItem} ${isSelected ? styles.noteListItemSelected : ''}`}
      onClick={onClick}
    >
      {note.isPinned && <PushPinIcon fontSize="small" color="primary" className={styles.pinnedIcon} />}

      <Box className={styles.noteListItemContent}>
        <Typography className={styles.noteListItemTitle}>
          {note.title || t("Common.Untitled")}
        </Typography>
        {contentPreview && (
          <Typography className={styles.noteListItemPreview}>
            {contentPreview}
          </Typography>
        )}
      </Box>

      <Box className={styles.noteListItemMeta}>
        {tags.slice(0, 2).map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            className={styles.tagChip}
            sx={{ backgroundColor: tag.color, color: 'white' }}
          />
        ))}
        <Typography variant="caption" color="text.secondary">
          {dayjs(note.updatedAt).fromNow()}
        </Typography>
      </Box>
    </Box>
  );
};
