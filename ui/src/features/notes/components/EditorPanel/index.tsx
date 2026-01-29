import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import { useAppSelector } from '@/store';
import { selectOpenTabs, selectActiveTabId } from '@/store/tabsSlice';
import { EditorTabs } from '../EditorTabs';
import { SingleNoteEditor } from '../NoteEditor/SingleNoteEditor';
import styles from './index.module.css';

export const EditorPanel = () => {
  const { t } = useTranslation();
  const openTabs = useAppSelector(selectOpenTabs);
  const activeTabId = useAppSelector(selectActiveTabId);

  if (openTabs.length === 0) {
    return (
      <Box className={styles.panel}>
        <Box className={styles.emptyState}>
          <NoteOutlinedIcon className={styles.emptyStateIcon} />
          <Typography variant="h6">{t('Notes.SelectNote')}</Typography>
          <Typography variant="body2">{t('Notes.SelectNoteHint')}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.panel}>
      <EditorTabs />
      <Box className={styles.editorsContainer}>
        {openTabs.map((tab) => (
          <SingleNoteEditor
            key={tab.id}
            noteId={tab.id}
            isActive={tab.id === activeTabId}
          />
        ))}
      </Box>
    </Box>
  );
};
