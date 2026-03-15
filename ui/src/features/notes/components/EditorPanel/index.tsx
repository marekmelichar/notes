import { lazy, Suspense, useRef, useEffect, useCallback, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectOpenTabs, selectActiveTabId } from '@/store/tabsSlice';
import { loadNoteDetail, selectNoteDetail } from '../../store/notesSlice';
import { EditorTabs } from '../EditorTabs';
import styles from './index.module.css';

export interface EditorSaveHandle {
  saveNow(): Promise<void>;
}

const SingleNoteEditor = lazy(() =>
  import('../NoteEditor/SingleNoteEditor').then((m) => ({ default: m.SingleNoteEditor })),
);

const EditorSkeleton = () => (
  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Skeleton variant="text" width="40%" height={36} />
    <Skeleton variant="rectangular" height={36} />
    <Skeleton variant="text" width="90%" />
    <Skeleton variant="text" width="75%" />
    <Skeleton variant="text" width="85%" />
    <Skeleton variant="text" width="60%" />
  </Box>
);

export const EditorPanel = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const openTabs = useAppSelector(selectOpenTabs);
  const activeTabId = useAppSelector(selectActiveTabId);
  const prevActiveTabIdRef = useRef<string | null>(null);
  const editorSaveRef = useRef<EditorSaveHandle | null>(null);
  const [readyTabId, setReadyTabId] = useState<string | null>(activeTabId);

  // Load note detail when a tab becomes active
  const noteDetail = useAppSelector((state) =>
    activeTabId ? selectNoteDetail(state, activeTabId) : null,
  );

  useEffect(() => {
    if (activeTabId && !noteDetail) {
      dispatch(loadNoteDetail(activeTabId));
    }
  }, [activeTabId, noteDetail, dispatch]);

  // Save before switching tabs — await the save before rendering the new editor
  useEffect(() => {
    const prevId = prevActiveTabIdRef.current;
    prevActiveTabIdRef.current = activeTabId;

    if (prevId && prevId !== activeTabId && editorSaveRef.current) {
      let cancelled = false;
      editorSaveRef.current.saveNow().finally(() => {
        if (!cancelled) setReadyTabId(activeTabId);
      });
      return () => { cancelled = true; };
    }

    setReadyTabId(activeTabId);
  }, [activeTabId]);

  const handleSaveRef = useCallback((handle: EditorSaveHandle | null) => {
    editorSaveRef.current = handle;
  }, []);

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
        <Suspense fallback={<EditorSkeleton />}>
          {readyTabId && noteDetail && (
            <SingleNoteEditor
              key={readyTabId}
              noteId={readyTabId}
              isActive={true}
              saveRef={handleSaveRef}
            />
          )}
        </Suspense>
      </Box>
    </Box>
  );
};
