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
import styles from './index.module.css';

interface SortableTabProps {
  tabId: string;
  title: string;
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
      <span className={styles.tabTitle}>{title}</span>
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
  const notes = useAppSelector((state) => state.notes.notes);

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
