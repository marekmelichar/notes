import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Note, Tag } from '../../types';
import styles from './index.module.css';

dayjs.extend(relativeTime);

const TRASH_RETENTION_DAYS = 30;

const getDaysUntilPermanentDelete = (deletedAt: number | null): number | null => {
  if (!deletedAt) return null;
  const deletedDate = dayjs(deletedAt);
  const expirationDate = deletedDate.add(TRASH_RETENTION_DAYS, 'day');
  const daysRemaining = expirationDate.diff(dayjs(), 'day');
  return Math.max(0, daysRemaining);
};

interface NoteCardProps {
  note: Note;
  tags: Tag[];
  isSelected: boolean;
  onSelect: (noteId: string) => void;
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

export const NoteCard = React.memo(({ note, tags, isSelected, onSelect }: NoteCardProps) => {
  const { t } = useTranslation();
  const contentPreview = stripHtmlTags(note.content).slice(0, 150);
  const daysRemaining = note.isDeleted ? getDaysUntilPermanentDelete(note.deletedAt) : null;

  return (
    <Box
      className={`${styles.noteCard} ${isSelected ? styles.noteCardSelected : ''} ${
        note.isPinned ? styles.noteCardPinned : ''
      }`}
      onClick={() => onSelect(note.id)}
    >
      <Box className={styles.noteCardHeader}>
        <Typography className={styles.noteCardTitle}>
          {note.title || t("Common.Untitled")}
        </Typography>
        {note.isPinned && (
          <Tooltip title={t("Notes.Pinned")}>
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
        {daysRemaining !== null ? (
          <Tooltip title={t("Notes.WillBeDeleted")}>
            <Box className={styles.trashCountdown}>
              <DeleteForeverIcon fontSize="small" color="error" />
              <Typography variant="caption" color="error">
                {daysRemaining === 0
                  ? t("Notes.DeletedToday")
                  : t("Notes.DaysRemaining", { days: daysRemaining })}
              </Typography>
            </Box>
          </Tooltip>
        ) : (
          <Typography variant="caption">
            {dayjs(note.updatedAt).fromNow()}
          </Typography>
        )}
        <Box className={styles.noteCardTags}>
          {tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              size="small"
              className={styles.tagChip}
              sx={{ backgroundColor: tag.color, color: 'white' }}
            />
          ))}
          {tags.length > 3 && (
            <Chip
              label={`+${tags.length - 3}`}
              size="small"
              className={styles.tagChip}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
});

NoteCard.displayName = 'NoteCard';
