import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectOpenTabs, selectActiveTabId, setActiveTab, closeTab } from '@/store/tabsSlice';
import styles from './index.module.css';

export const EditorTabs = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const openTabs = useAppSelector(selectOpenTabs);
  const activeTabId = useAppSelector(selectActiveTabId);
  const notes = useAppSelector((state) => state.notes.notes);

  const handleTabClick = useCallback(
    (tabId: string) => {
      dispatch(setActiveTab(tabId));
    },
    [dispatch],
  );

  const handleTabClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      dispatch(closeTab(tabId));
    },
    [dispatch],
  );

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        dispatch(closeTab(tabId));
      }
    },
    [dispatch],
  );

  if (openTabs.length === 0) return null;

  return (
    <Box className={styles.tabBar}>
      {openTabs.map((tab) => {
        const note = notes.find((n) => n.id === tab.id);
        const title = note?.title || t('Common.Untitled');
        const isActive = tab.id === activeTabId;

        return (
          <Box
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
          >
            {tab.hasUnsavedChanges && <span className={styles.unsavedDot} />}
            <span className={styles.tabTitle}>{title}</span>
            <button
              className={styles.closeButton}
              onClick={(e) => handleTabClose(e, tab.id)}
              aria-label={t('Tabs.CloseTab')}
            >
              ×
            </button>
          </Box>
        );
      })}
    </Box>
  );
};
