import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

interface EditorFooterProps {
  wordCount: number;
  charCount: number;
  autoSaveCountdown: number | null;
  autoSaveLabel: string;
  lastSaved: Date | null;
  lastSavedLabel: string;
}

export const EditorFooter = ({
  wordCount,
  charCount,
  autoSaveCountdown,
  autoSaveLabel,
  lastSaved,
  lastSavedLabel,
}: EditorFooterProps) => {
  const { t } = useTranslation();

  return (
    <Box className={styles.footer}>
      <Box className={styles.footerLeft}>
        <Typography variant="caption">
          {wordCount} {t('Notes.Words')} | {charCount} {t('Notes.Characters')}
        </Typography>
      </Box>
      <Box className={styles.footerRight}>
        {autoSaveCountdown !== null && (
          <Typography variant="caption">
            {autoSaveLabel} {autoSaveCountdown}s
          </Typography>
        )}
        {lastSaved && (
          <Typography variant="caption">
            {lastSavedLabel} {lastSaved.toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
