import React from 'react';
import { Box, BottomNavigation, BottomNavigationAction } from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector, setMobileView, MobileView } from '@/store';
import styles from './index.module.css';

export const MobileNavigation = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mobileView = useAppSelector((state) => state.ui.mobileView);
  const selectedNote = useAppSelector((state) => state.notes.selectedNoteId);

  const handleChange = (_event: React.SyntheticEvent, newValue: MobileView) => {
    dispatch(setMobileView(newValue));
  };

  return (
    <Box className={styles.container}>
      <BottomNavigation
        value={mobileView}
        onChange={handleChange}
        showLabels
        className={styles.navigation}
      >
        <BottomNavigationAction
          label={t('Common.Nav.Folders')}
          value="sidebar"
          icon={<FolderOutlinedIcon />}
          className={styles.action}
        />
        <BottomNavigationAction
          label={t('Common.Nav.Notes')}
          value="list"
          icon={<ListAltOutlinedIcon />}
          className={styles.action}
        />
        <BottomNavigationAction
          label={t('Common.Nav.Editor')}
          value="editor"
          icon={<EditNoteOutlinedIcon />}
          disabled={!selectedNote}
          className={styles.action}
        />
      </BottomNavigation>
    </Box>
  );
};
