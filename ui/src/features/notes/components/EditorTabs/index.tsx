import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectOpenTabs,
  selectActiveTabId,
  setActiveTab,
  closeTab,
  reorderTabs,
} from '@/store/tabsSlice';
import { selectAllNotes } from '../../store/notesSlice';
import { selectAllFolders } from '../../store/foldersSlice';
import styles from './index.module.css';

interface SortableTabProps {
  tabId: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  onTabClick: (tabId: string) => void;
  onTabClose: (e: React.MouseEvent, tabId: string) => void;
  onMiddleClick: (e: React.MouseEvent, tabId: string) => void;
  closeLabel: string;
}

const SortableTab = ({
  tabId,
  title,
  subtitle,
  isActive,
  hasUnsavedChanges,
  onTabClick,
  onTabClose,
  onMiddleClick,
  closeLabel,
}: SortableTabProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tabId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`editor-tab-${tabId}`}
      className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
      onClick={() => onTabClick(tabId)}
      onMouseDown={(e) => onMiddleClick(e, tabId)}
    >
      {hasUnsavedChanges && <span className={styles.unsavedDot} />}
      <span className={styles.tabTitle}>
        {title}
        {subtitle && <span className={styles.tabSubtitle}> — {subtitle}</span>}
      </span>
      <button
        data-testid="editor-tab-close"
        className={styles.closeButton}
        onClick={(e) => onTabClose(e, tabId)}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={closeLabel}
      >
        ×
      </button>
    </Box>
  );
};

export const EditorTabs = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const openTabs = useAppSelector(selectOpenTabs);
  const activeTabId = useAppSelector(selectActiveTabId);
  const notes = useAppSelector(selectAllNotes);
  const folders = useAppSelector(selectAllFolders);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const tabIds = useMemo(() => openTabs.map((tab) => tab.id), [openTabs]);

  // Detect duplicate tab titles and compute folder-based disambiguation
  const tabSubtitles = useMemo(() => {
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const folderMap = new Map(folders.map((f) => [f.id, f]));

    const titleCounts = new Map<string, string[]>();
    for (const tab of openTabs) {
      const title = noteMap.get(tab.id)?.title || t('Common.Untitled');
      const existing = titleCounts.get(title) || [];
      existing.push(tab.id);
      titleCounts.set(title, existing);
    }

    const subtitles = new Map<string, string>();
    for (const [, tabIdsForTitle] of titleCounts) {
      if (tabIdsForTitle.length <= 1) continue;

      // Check if folder names alone disambiguate
      const folderNames = tabIdsForTitle.map((id) => {
        const note = noteMap.get(id);
        return note?.folderId
          ? folderMap.get(note.folderId)?.name || t('Notes.Unfiled')
          : t('Notes.Unfiled');
      });
      const hasDuplicateFolders = folderNames.length !== new Set(folderNames).size;

      for (let i = 0; i < tabIdsForTitle.length; i++) {
        const tabId = tabIdsForTitle[i];
        let subtitle = folderNames[i];
        if (hasDuplicateFolders) {
          const note = noteMap.get(tabId);
          const date = note ? new Date(note.createdAt).toLocaleDateString() : '';
          subtitle = `${subtitle}, ${date}`;
        }
        subtitles.set(tabId, subtitle);
      }
    }
    return subtitles;
  }, [openTabs, notes, folders, t]);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = openTabs.findIndex((t) => t.id === active.id);
      const toIndex = openTabs.findIndex((t) => t.id === over.id);
      dispatch(reorderTabs({ fromIndex, toIndex }));
    },
    [dispatch, openTabs],
  );

  if (openTabs.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        <Box className={styles.tabBar}>
          {openTabs.map((tab) => {
            const note = notes.find((n) => n.id === tab.id);
            const title = note?.title || t('Common.Untitled');
            const isActive = tab.id === activeTabId;

            return (
              <SortableTab
                key={tab.id}
                tabId={tab.id}
                title={title}
                subtitle={tabSubtitles.get(tab.id)}
                isActive={isActive}
                hasUnsavedChanges={tab.hasUnsavedChanges}
                onTabClick={handleTabClick}
                onTabClose={handleTabClose}
                onMiddleClick={handleMiddleClick}
                closeLabel={t('Tabs.CloseTab')}
              />
            );
          })}
        </Box>
      </SortableContext>
      <DragOverlay>
        {activeId ? (() => {
          const tab = openTabs.find((t) => t.id === activeId);
          if (!tab) return null;
          const note = notes.find((n) => n.id === tab.id);
          const title = note?.title || t('Common.Untitled');
          return (
            <Box className={`${styles.tab} ${styles.tabDragOverlay}`}>
              {tab.hasUnsavedChanges && <span className={styles.unsavedDot} />}
              <span className={styles.tabTitle}>{title}</span>
            </Box>
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
};
