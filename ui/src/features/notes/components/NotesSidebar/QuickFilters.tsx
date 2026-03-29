import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import styles from './index.module.css';

interface QuickFiltersProps {
  allNotesCount: number;
  favoritesCount: number;
  trashCount: number;
  onAllNotes: () => void;
  onFavorites: () => void;
  onTrash: () => void;
}

export const QuickFilters = ({
  allNotesCount,
  favoritesCount,
  trashCount,
  onAllNotes,
  onFavorites,
  onTrash,
}: QuickFiltersProps) => {
  const { t } = useTranslation();

  return (
    <Box className={styles.section}>
      <Box className={styles.navItem} onClick={onAllNotes} data-testid="quick-filter-all-notes">
        <NoteOutlinedIcon fontSize="small" className={styles.navItemIcon} />
        <Typography className={styles.navItemLabel}>{t('Notes.AllNotes')}</Typography>
        <span className={styles.navItemCount}>{allNotesCount}</span>
      </Box>

      <Box className={styles.navItem} onClick={onFavorites} data-testid="quick-filter-favorites">
        <StarOutlineIcon fontSize="small" className={styles.navItemIcon} />
        <Typography className={styles.navItemLabel}>{t('Notes.Favorites')}</Typography>
        <span className={styles.navItemCount}>{favoritesCount}</span>
      </Box>

      <Box className={styles.navItem} onClick={onTrash} data-testid="quick-filter-trash">
        <DeleteOutlineIcon fontSize="small" className={styles.navItemIcon} />
        <Typography className={styles.navItemLabel}>{t('Notes.Trash')}</Typography>
        <span className={styles.navItemCount}>{trashCount}</span>
      </Box>
    </Box>
  );
};
