import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import {
  useAppDispatch,
  useAppSelector,
  toggleSidebarCollapsed,
  openTab,
  selectActiveTabId,
  selectIsMobile,
  selectNoteListHidden,
} from '@/store';
import { setNoteListHidden } from '@/store/uiSlice';
import {
  setFilter,
  resetFilter,
  selectNotesFilter,
  selectAllNotes,
  selectActiveNotesCount,
  selectFavoritesCount,
  selectTrashCount,
  updateNote,
  reorderNotes,
} from '../../store/notesSlice';
import {
  selectAllFolders,
  expandFolder,
  updateFolder,
} from '../../store/foldersSlice';
import type { Folder, Note, NotesFilter } from '../../types';
import { QuickFilters } from './QuickFilters';
import { RecentNotes } from './RecentNotes';
import { FoldersSection } from './FoldersSection';
import { TagsSection } from './TagsSection';
import styles from './index.module.css';

const RECENT_NOTES_LIMIT = 5;

interface NotesSidebarProps {
  collapsed?: boolean;
}

export const NotesSidebar = ({ collapsed = false }: NotesSidebarProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectNotesFilter);
  const notes = useAppSelector(selectAllNotes);
  const allNotesCount = useAppSelector(selectActiveNotesCount);
  const favoritesCount = useAppSelector(selectFavoritesCount);
  const trashCount = useAppSelector(selectTrashCount);
  const allFolders = useAppSelector(selectAllFolders);
  const selectedNoteId = useAppSelector(selectActiveTabId);
  const isMobile = useAppSelector(selectIsMobile);
  const noteListHidden = useAppSelector(selectNoteListHidden);
  const skipAnimationRef = useRef(false);

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);

  const recentNotes = useMemo(() => {
    return [...notes]
      .filter((n) => !n.isDeleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_NOTES_LIMIT);
  }, [notes]);

  const unfiledNotes = useMemo(() => {
    return notes
      .filter((n) => !n.folderId && !n.isDeleted)
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  }, [notes]);

  const unfiledNoteIds = useMemo(() => unfiledNotes.map((n) => `note-${n.id}`), [unfiledNotes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Expand all ancestor folders when a note is selected
  useEffect(() => {
    if (selectedNoteId) {
      const selectedNote = notes.find((n) => n.id === selectedNoteId);
      if (selectedNote?.folderId) {
        skipAnimationRef.current = true;
        const expandAncestors = (folderId: string) => {
          dispatch(expandFolder(folderId));
          const folder = allFolders.find((f) => f.id === folderId);
          if (folder?.parentId) expandAncestors(folder.parentId);
        };
        expandAncestors(selectedNote.folderId);
        requestAnimationFrame(() => {
          skipAnimationRef.current = false;
        });
      }
    }
  }, [selectedNoteId, notes, allFolders, dispatch]);

  // Helper to check if targetId is a descendant of folderId
  const isDescendantOf = (folderId: string, targetId: string): boolean => {
    const children = allFolders.filter((f) => f.parentId === folderId);
    for (const child of children) {
      if (child.id === targetId) return true;
      if (isDescendantOf(child.id, targetId)) return true;
    }
    return false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'note') {
      setActiveNote(active.data.current.note);
      setActiveFolder(null);
    } else if (active.data.current?.type === 'draggable-folder') {
      setActiveFolder(active.data.current.folder);
      setActiveNote(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNote(null);
    setActiveFolder(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Folder drag
    if (activeData?.type === 'draggable-folder') {
      const draggedFolder = activeData.folder as Folder;

      if (overData?.type === 'folder') {
        const targetFolderId = overData.folderId as string;
        if (draggedFolder.id === targetFolderId) return;
        if (isDescendantOf(draggedFolder.id, targetFolderId)) return;
        if (draggedFolder.parentId === targetFolderId) return;
        dispatch(updateFolder({ id: draggedFolder.id, updates: { parentId: targetFolderId } }));
        dispatch(expandFolder(targetFolderId));
        return;
      }

      if (overData?.type === 'unfiled') {
        if (draggedFolder.parentId !== null) {
          dispatch(updateFolder({ id: draggedFolder.id, updates: { parentId: null } }));
        }
        return;
      }
    }

    // Note drag
    if (activeData?.type === 'note') {
      const note = activeData.note as Note;
      const activeId = active.id as string;
      const overId = over.id as string;

      if (overData?.type === 'note') {
        const overNote = overData.note as Note;
        if (note.folderId === overNote.folderId && activeId !== overId) {
          const folderNotes = notes
            .filter((n) => n.folderId === note.folderId && !n.isDeleted)
            .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
          const oldIndex = folderNotes.findIndex((n) => n.id === note.id);
          const newIndex = folderNotes.findIndex((n) => n.id === overNote.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedNotes = arrayMove(folderNotes, oldIndex, newIndex);
            const noteOrders = reorderedNotes.map((n, index) => ({ id: n.id, order: index + 1 }));
            dispatch(reorderNotes({ noteOrders }));
          }
        } else if (note.folderId !== overNote.folderId) {
          dispatch(updateNote({ id: note.id, updates: { folderId: overNote.folderId ?? '' } }));
          if (overNote.folderId) dispatch(expandFolder(overNote.folderId));
        }
        return;
      }

      if (overData?.type === 'folder') {
        const newFolderId = overData.folderId as string;
        if (note.folderId !== newFolderId) {
          dispatch(updateNote({ id: note.id, updates: { folderId: newFolderId } }));
          dispatch(expandFolder(newFolderId));
        }
        return;
      }

      if (overData?.type === 'unfiled') {
        if (note.folderId !== null) {
          dispatch(updateNote({ id: note.id, updates: { folderId: '' } }));
        }
        return;
      }
    }
  };

  const showNoteListIfHidden = () => {
    if (noteListHidden) dispatch(setNoteListHidden(false));
  };

  const makeFilterHandler = (filter: Partial<NotesFilter> | null) => () => {
    dispatch(filter === null ? resetFilter() : setFilter(filter));
    showNoteListIfHidden();
  };

  const handleAllNotes = makeFilterHandler(null);
  const handleFavorites = makeFilterHandler({ isPinned: true, isDeleted: false, folderId: null, tagIds: [] });
  const handleTrash = makeFilterHandler({ isDeleted: true, isPinned: null, folderId: null, tagIds: [] });

  const handleToggleCollapse = () => {
    dispatch(toggleSidebarCollapsed());
  };

  const isAllNotesActive = !filter.isDeleted && filter.isPinned === null && filter.folderId === null;
  const isFavoritesActive = filter.isPinned === true && !filter.isDeleted;
  const isTrashActive = filter.isDeleted;

  // Collapsed view - icons only
  if (collapsed) {
    return (
      <Box className={`${styles.sidebar} ${styles.sidebarCollapsed}`}>
        {!isMobile && (
          <Box className={styles.collapseToggle}>
            <Tooltip title={t('Common.ExpandSidebar')} placement="right">
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box className={styles.collapsedNav}>
          <Tooltip title={t('Notes.AllNotes')} placement="right">
            <IconButton
              size="small"
              onClick={handleAllNotes}
              className={isAllNotesActive ? styles.collapsedNavActive : ''}
            >
              <NoteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Notes.Favorites')} placement="right">
            <IconButton
              size="small"
              onClick={handleFavorites}
              className={isFavoritesActive ? styles.collapsedNavActive : ''}
            >
              <StarOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Notes.Trash')} placement="right">
            <IconButton
              size="small"
              onClick={handleTrash}
              className={isTrashActive ? styles.collapsedNavActive : ''}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box className={styles.collapsedDivider} />
        <Box className={styles.collapsedNav}>
          <Tooltip title={t('Folders.Folders')} placement="right">
            <IconButton size="small">
              <FolderOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Tags.Tags')} placement="right">
            <IconButton size="small">
              <LocalOfferOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box className={styles.sidebar}>
        {!isMobile && (
          <Box className={styles.collapseToggle}>
            <Tooltip title={t('Common.CollapseSidebar')}>
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <QuickFilters
          allNotesCount={allNotesCount}
          favoritesCount={favoritesCount}
          trashCount={trashCount}
          onAllNotes={handleAllNotes}
          onFavorites={handleFavorites}
          onTrash={handleTrash}
        />

        <RecentNotes
          notes={recentNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={(id) => dispatch(openTab(id))}
        />

        <FoldersSection
          unfiledNotes={unfiledNotes}
          unfiledNoteIds={unfiledNoteIds}
          skipAnimationRef={skipAnimationRef}
        />

        <TagsSection />
      </Box>

      <DragOverlay>
        {activeNote && (
          <Box className={styles.dragOverlay}>
            <DescriptionOutlinedIcon fontSize="small" />
            <Typography noWrap>{activeNote.title || t('Common.Untitled')}</Typography>
          </Box>
        )}
        {activeFolder && (
          <Box className={styles.folderDragOverlay}>
            <FolderOutlinedIcon fontSize="small" sx={{ color: activeFolder.color }} />
            <Typography noWrap>{activeFolder.name}</Typography>
          </Box>
        )}
      </DragOverlay>
    </DndContext>
  );
};
