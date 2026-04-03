import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, openTab, selectActiveTabId } from '@/store';

/**
 * Bidirectional sync between URL note ID param and Redux active tab.
 * URL change → opens tab; tab change → updates URL.
 */
export function useUrlTabSync(urlNoteId: string | undefined) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const activeTabId = useAppSelector(selectActiveTabId);

  const prevUrlNoteId = useRef<string | undefined>(undefined);
  const prevActiveTabId = useRef(activeTabId);

  useEffect(() => {
    const isFirstRun = prevUrlNoteId.current === undefined;
    const urlChanged = urlNoteId !== prevUrlNoteId.current;
    const tabChanged = activeTabId !== prevActiveTabId.current;

    if ((urlChanged || isFirstRun) && urlNoteId && urlNoteId !== activeTabId) {
      dispatch(openTab(urlNoteId));
    } else if (tabChanged) {
      if (activeTabId && activeTabId !== urlNoteId) {
        navigate(`/notes/${activeTabId}`, { replace: true });
      } else if (!activeTabId && urlNoteId) {
        navigate('/', { replace: true });
      }
    }

    prevUrlNoteId.current = urlNoteId;
    prevActiveTabId.current = activeTabId;
  }, [urlNoteId, activeTabId, dispatch, navigate]);

  return activeTabId;
}
