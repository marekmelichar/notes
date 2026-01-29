import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import NoteOutlinedIcon from "@mui/icons-material/NoteOutlined";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useAppDispatch, useAppSelector, toggleSidebarCollapsed } from "@/store";
import { setNoteListHidden } from "@/store/uiSlice";
import {
  setFilter,
  resetFilter,
  selectNotesFilter,
  selectAllNotes,
  setSelectedNote,
  updateNote,
  reorderNotes,
} from "../../store/notesSlice";
import {
  selectRootFolders,
  selectChildFolders,
  selectExpandedFolderIds,
  selectFoldersLoading,
  selectAllFolders,
  toggleFolderExpanded,
  expandFolder,
  setExpandedFolders,
  createFolder,
  updateFolder,
} from "../../store/foldersSlice";
import {
  selectAllTags,
  selectTagsLoading,
  createTag,
  updateTag,
  deleteTag,
} from "../../store/tagsSlice";
import type { Folder, Note } from "../../types";
import styles from "./index.module.css";

// Module-level flag to skip Collapse animations during programmatic expansion
let skipCollapseAnimation = false;

interface SortableNoteProps {
  note: Note;
  level: number;
}

const SortableNote = ({ note, level }: SortableNoteProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const noteListHidden = useAppSelector((state) => state.ui.noteListHidden);
  const isSelected = selectedNoteId === note.id;
  const elementRef = React.useRef<HTMLDivElement | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `note-${note.id}`,
    data: { type: "note", note },
  });

  const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    elementRef.current = node;
  }, [setNodeRef]);

  // Scroll into view when selected (skip when note list is hidden)
  React.useEffect(() => {
    if (!isSelected || noteListHidden) return;
    // Small delay for DOM to update after instant folder expansion
    const timer = requestAnimationFrame(() => {
      elementRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(timer);
  }, [isSelected, noteListHidden]);

  const step = isMobile ? 10 : 30;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: level > 0 ? step + level * step : 12,
    opacity: isDragging ? 0.5 : 1,
    "--indent-level": level,
  } as React.CSSProperties;

  const handleClick = () => {
    // Only select the note - don't change the filter
    // The tree view already shows folder context visually
    dispatch(setSelectedNote(note.id));
  };

  return (
    <Box
      ref={combinedRef}
      className={`${styles.noteTreeItem} ${isSelected ? styles.noteTreeItemActive : ""} ${isDragging ? styles.dragging : ""}`}
      style={style}
      onClick={handleClick}
    >
      <Box {...listeners} {...attributes} className={styles.dragHandle}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <DescriptionOutlinedIcon
        fontSize="small"
        className={styles.noteTreeIcon}
      />
      <Typography className={styles.noteTreeLabel} noWrap>
        {note.title || t("Common.Untitled")}
      </Typography>
    </Box>
  );
};

interface DroppableFolderProps {
  folder: Folder;
  level?: number;
  showNotes?: boolean;
  onAddSubfolder: (parentId: string) => void;
}

const DroppableFolder = ({
  folder,
  level = 0,
  showNotes = false,
  onAddSubfolder,
}: DroppableFolderProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const childFolders = useAppSelector(selectChildFolders(folder.id));
  const notes = useAppSelector(selectAllNotes);

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id, folder },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `draggable-folder-${folder.id}`,
    data: { type: "draggable-folder", folder },
  });

  const isExpanded = expandedIds.includes(folder.id);

  const folderNotes = useMemo(() => {
    return notes
      .filter((n) => n.folderId === folder.id && !n.isDeleted)
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  }, [notes, folder.id]);
  const noteIds = useMemo(
    () => folderNotes.map((n) => `note-${n.id}`),
    [folderNotes]
  );
  const hasChildren =
    childFolders.length > 0 || (showNotes && folderNotes.length > 0);

  const handleClick = () => {
    dispatch(
      setFilter({
        folderId: folder.id,
        isDeleted: false,
        isPinned: null,
        tagIds: [],
        searchQuery: "",
      })
    );
    if (!isExpanded) {
      dispatch(expandFolder(folder.id));
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleFolderExpanded(folder.id));
  };

  const handleAddSubfolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubfolder(folder.id);
  };

  // Combine refs for both droppable and sortable
  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  const step = isMobile ? 10 : 30;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: level > 0 ? step + level * step : 12,
    "--indent-level": level,
  } as React.CSSProperties;

  return (
    <>
      <Box
        ref={setNodeRef}
        className={`${styles.folderItem} ${isOver ? styles.dropTarget : ""} ${isDragging ? styles.folderDragging : ""}`}
        style={style}
        onClick={handleClick}
      >
        <Box {...listeners} {...attributes} className={styles.folderDragHandle}>
          <DragIndicatorIcon fontSize="small" />
        </Box>
        <Box className={styles.folderItemIcon}>
          {hasChildren ? (
            <IconButton
              size="small"
              onClick={handleToggleExpand}
              className={styles.expandButton}
            >
              {isExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          ) : null}
        </Box>
        {isExpanded ? (
          <FolderOpenIcon fontSize="small" sx={{ color: folder.color }} />
        ) : (
          <FolderOutlinedIcon fontSize="small" sx={{ color: folder.color }} />
        )}
        <Typography className={styles.folderItemLabel}>
          {folder.name}
        </Typography>
        {folderNotes.length > 0 && (
          <span className={styles.navItemCount}>{folderNotes.length}</span>
        )}
        <Tooltip title={t("Folders.AddSubfolder")}>
          <IconButton
            size="small"
            className={styles.addSubfolderButton}
            onClick={handleAddSubfolder}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={isExpanded} timeout={skipCollapseAnimation ? 0 : "auto"}>
        {/* Notes appear first, directly under parent folder */}
        {showNotes && (
          <SortableContext
            items={noteIds}
            strategy={verticalListSortingStrategy}
          >
            {folderNotes.map((note) => (
              <SortableNote key={note.id} note={note} level={level + 1} />
            ))}
          </SortableContext>
        )}
        {/* Then child folders */}
        {childFolders.map((child) => (
          <DroppableFolder
            key={child.id}
            folder={child}
            level={level + 1}
            showNotes={showNotes}
            onAddSubfolder={onAddSubfolder}
          />
        ))}
      </Collapse>
    </>
  );
};

const UnfiledDropZone = ({ children }: { children: React.ReactNode }) => {
  const { isOver, setNodeRef, node } = useDroppable({
    id: "unfiled",
    data: { type: "unfiled", folderId: null },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.unfiledSection} ${isOver ? styles.dropTarget : ""}`}
      data-droppable-id="unfiled"
    >
      {children}
    </div>
  );
};

interface NotesSidebarProps {
  collapsed?: boolean;
}

export const NotesSidebar = ({ collapsed = false }: NotesSidebarProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectNotesFilter);
  const notes = useAppSelector(selectAllNotes);
  const allFolders = useAppSelector(selectAllFolders);
  const rootFolders = useAppSelector(selectRootFolders);
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const tags = useAppSelector(selectAllTags);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isFoldersLoading = useAppSelector(selectFoldersLoading);
  const isTagsLoading = useAppSelector(selectTagsLoading);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const noteListHidden = useAppSelector((state) => state.ui.noteListHidden);

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isEditTagDialogOpen, setIsEditTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("#6366f1");
  const [showTreeView, setShowTreeView] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const RECENT_STORAGE_KEY = 'notes-recent-height';
  const RECENT_MIN_HEIGHT = 60;
  const RECENT_MAX_HEIGHT = 500;
  const RECENT_DEFAULT_HEIGHT = 180;
  const [recentHeight, setRecentHeight] = useState(() => {
    const saved = localStorage.getItem(RECENT_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : RECENT_DEFAULT_HEIGHT;
  });
  const [resizingRecent, setResizingRecent] = useState(false);
  const recentStartY = useRef(0);
  const recentStartHeight = useRef(0);

  const handleRecentResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingRecent(true);
    recentStartY.current = e.clientY;
    recentStartHeight.current = recentHeight;
  }, [recentHeight]);

  const handleRecentResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRecent) return;
    const delta = e.clientY - recentStartY.current;
    const newHeight = Math.min(Math.max(recentStartHeight.current + delta, RECENT_MIN_HEIGHT), RECENT_MAX_HEIGHT);
    setRecentHeight(newHeight);
  }, [resizingRecent]);

  const handleRecentResizeEnd = useCallback(() => {
    if (!resizingRecent) return;
    localStorage.setItem(RECENT_STORAGE_KEY, recentHeight.toString());
    setResizingRecent(false);
  }, [resizingRecent, recentHeight]);

  useEffect(() => {
    if (resizingRecent) {
      document.addEventListener('mousemove', handleRecentResizeMove);
      document.addEventListener('mouseup', handleRecentResizeEnd);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleRecentResizeMove);
      document.removeEventListener('mouseup', handleRecentResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingRecent, handleRecentResizeMove, handleRecentResizeEnd]);

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [parentFolderIdForCreate, setParentFolderIdForCreate] = useState<
    string | null
  >(null);

  // Helper to check if targetId is a descendant of folderId (circular reference check)
  const isDescendantOf = (folderId: string, targetId: string): boolean => {
    const children = allFolders.filter((f) => f.parentId === folderId);
    for (const child of children) {
      if (child.id === targetId) return true;
      if (isDescendantOf(child.id, targetId)) return true;
    }
    return false;
  };

  // Get parent folder name for dialog
  const parentFolderForCreate = parentFolderIdForCreate
    ? allFolders.find((f) => f.id === parentFolderIdForCreate)
    : null;

  const recentNotes = useMemo(() => {
    return [...notes]
      .filter((n) => !n.isDeleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 18);
  }, [notes]);

  const unfiledNotes = useMemo(() => {
    return notes
      .filter((n) => !n.folderId && !n.isDeleted)
      .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  }, [notes]);
  const unfiledNoteIds = useMemo(
    () => unfiledNotes.map((n) => `note-${n.id}`),
    [unfiledNotes]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Expand all ancestor folders when a note is selected (instant, no animation)
  useEffect(() => {
    if (selectedNoteId) {
      const selectedNote = notes.find((n) => n.id === selectedNoteId);
      if (selectedNote?.folderId) {
        skipCollapseAnimation = true;
        const expandAncestors = (folderId: string) => {
          dispatch(expandFolder(folderId));
          const folder = allFolders.find((f) => f.id === folderId);
          if (folder?.parentId) {
            expandAncestors(folder.parentId);
          }
        };
        expandAncestors(selectedNote.folderId);
        // Reset after the render applies
        requestAnimationFrame(() => {
          skipCollapseAnimation = false;
        });
      }
    }
  }, [selectedNoteId, notes, allFolders, dispatch]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "note") {
      setActiveNote(active.data.current.note);
      setActiveFolder(null);
    } else if (active.data.current?.type === "draggable-folder") {
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

    // Handle folder drag
    if (activeData?.type === "draggable-folder") {
      const draggedFolder = activeData.folder as Folder;

      // Check if dropping on another folder
      if (overData?.type === "folder") {
        const targetFolderId = overData.folderId as string;

        // Prevent dropping on itself
        if (draggedFolder.id === targetFolderId) return;

        // Prevent dropping on a descendant (circular reference)
        if (isDescendantOf(draggedFolder.id, targetFolderId)) return;

        // Prevent dropping if already a child of target
        if (draggedFolder.parentId === targetFolderId) return;

        // Move folder to new parent
        dispatch(
          updateFolder({
            id: draggedFolder.id,
            updates: { parentId: targetFolderId },
          })
        );
        dispatch(expandFolder(targetFolderId));
        return;
      }

      // Check if dropping on unfiled zone (move to root)
      if (overData?.type === "unfiled") {
        if (draggedFolder.parentId !== null) {
          dispatch(
            updateFolder({
              id: draggedFolder.id,
              updates: { parentId: null },
            })
          );
        }
        return;
      }
    }

    // Handle note drag
    if (activeData?.type === "note") {
      const note = activeData.note as Note;
      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dropping on another note (reordering)
      if (overData?.type === "note") {
        const overNote = overData.note as Note;

        // Only reorder if notes are in the same folder
        if (note.folderId === overNote.folderId && activeId !== overId) {
          // Get all notes in this folder sorted by order
          const folderNotes = notes
            .filter((n) => n.folderId === note.folderId && !n.isDeleted)
            .sort(
              (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)
            );

          const oldIndex = folderNotes.findIndex((n) => n.id === note.id);
          const newIndex = folderNotes.findIndex((n) => n.id === overNote.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedNotes = arrayMove(folderNotes, oldIndex, newIndex);

            // Create new order values for all notes in the folder
            const noteOrders = reorderedNotes.map((n, index) => ({
              id: n.id,
              order: index + 1,
            }));

            dispatch(reorderNotes({ noteOrders }));
          }
        } else if (note.folderId !== overNote.folderId) {
          // Moving to a different folder - place at the end
          // Use empty string to clear folder (null means "don't change" in the API)
          dispatch(
            updateNote({
              id: note.id,
              updates: { folderId: overNote.folderId ?? "" },
            })
          );
          if (overNote.folderId) {
            dispatch(expandFolder(overNote.folderId));
          }
        }
        return;
      }

      // Check if dropping on a folder
      if (overData?.type === "folder") {
        const newFolderId = overData.folderId as string;
        if (note.folderId !== newFolderId) {
          dispatch(
            updateNote({ id: note.id, updates: { folderId: newFolderId } })
          );
          dispatch(expandFolder(newFolderId));
        }
        return;
      }

      // Check if dropping on unfiled zone
      if (overData?.type === "unfiled") {
        if (note.folderId !== null) {
          // Use empty string to clear folder (null means "don't change" in the API)
          dispatch(updateNote({ id: note.id, updates: { folderId: "" } }));
        }
        return;
      }
    }
  };

  const allNotesCount = notes.filter((n) => !n.isDeleted).length;
  const favoritesCount = notes.filter((n) => n.isPinned && !n.isDeleted).length;
  const trashCount = notes.filter((n) => n.isDeleted).length;

  const showNoteListIfHidden = () => {
    if (noteListHidden) dispatch(setNoteListHidden(false));
  };

  const handleAllNotes = () => {
    dispatch(resetFilter());
    showNoteListIfHidden();
  };

  const handleFavorites = () => {
    dispatch(
      setFilter({
        isPinned: true,
        isDeleted: false,
        folderId: null,
        tagIds: [],
        searchQuery: "",
      })
    );
    showNoteListIfHidden();
  };

  const handleTrash = () => {
    dispatch(
      setFilter({
        isDeleted: true,
        isPinned: null,
        folderId: null,
        tagIds: [],
        searchQuery: "",
      })
    );
    showNoteListIfHidden();
  };

  const handleTagClick = (tagId: string) => {
    const currentTags = filter.tagIds;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    dispatch(setFilter({ tagIds: newTags }));
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      dispatch(
        createFolder({
          name: newFolderName.trim(),
          parentId: parentFolderIdForCreate,
        })
      );
      setNewFolderName("");
      setParentFolderIdForCreate(null);
      setIsFolderDialogOpen(false);
      // Expand parent folder to show new subfolder
      if (parentFolderIdForCreate) {
        dispatch(expandFolder(parentFolderIdForCreate));
      }
    }
  };

  const handleOpenSubfolderDialog = (parentId: string) => {
    setParentFolderIdForCreate(parentId);
    setIsFolderDialogOpen(true);
  };

  const handleCloseFolderDialog = () => {
    setNewFolderName("");
    setParentFolderIdForCreate(null);
    setIsFolderDialogOpen(false);
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      dispatch(createTag({ name: newTagName.trim(), color: newTagColor }));
      setNewTagName("");
      setNewTagColor("#6366f1");
      setIsTagDialogOpen(false);
    }
  };

  const handleOpenEditTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      setEditingTagId(tagId);
      setEditTagName(tag.name);
      setEditTagColor(tag.color);
      setIsEditTagDialogOpen(true);
    }
  };

  const handleCloseEditTagDialog = () => {
    setIsEditTagDialogOpen(false);
    setEditingTagId(null);
    setEditTagName("");
    setEditTagColor("#6366f1");
  };

  const handleUpdateTag = () => {
    if (editingTagId && editTagName.trim()) {
      dispatch(
        updateTag({
          id: editingTagId,
          updates: { name: editTagName.trim(), color: editTagColor },
        })
      );
      handleCloseEditTagDialog();
    }
  };

  const handleDeleteTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(deleteTag(tagId));
    // Remove the tag from filter if it was selected
    if (filter.tagIds.includes(tagId)) {
      dispatch(setFilter({ tagIds: filter.tagIds.filter((id) => id !== tagId) }));
    }
  };

  // Check if all folders are expanded
  const areAllFoldersExpanded =
    allFolders.length > 0 &&
    allFolders.every((f) => expandedIds.includes(f.id));

  const handleToggleExpandAll = () => {
    if (areAllFoldersExpanded) {
      // Collapse all
      dispatch(setExpandedFolders([]));
    } else {
      // Expand all
      dispatch(setExpandedFolders(allFolders.map((f) => f.id)));
    }
  };

  const isAllNotesActive =
    !filter.isDeleted && filter.isPinned === null && filter.folderId === null;
  const isFavoritesActive = filter.isPinned === true && !filter.isDeleted;
  const isTrashActive = filter.isDeleted;

  const handleToggleCollapse = () => {
    dispatch(toggleSidebarCollapsed());
  };

  // Collapsed view - icons only
  if (collapsed) {
    return (
      <Box className={`${styles.sidebar} ${styles.sidebarCollapsed}`}>
        {!isMobile && (
          <Box className={styles.collapseToggle}>
            <Tooltip title={t("Common.ExpandSidebar")} placement="right">
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box className={styles.collapsedNav}>
          <Tooltip title={t("Notes.AllNotes")} placement="right">
            <IconButton
              size="small"
              onClick={handleAllNotes}
              className={isAllNotesActive ? styles.collapsedNavActive : ""}
            >
              <NoteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Notes.Favorites")} placement="right">
            <IconButton
              size="small"
              onClick={handleFavorites}
              className={isFavoritesActive ? styles.collapsedNavActive : ""}
            >
              <StarOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Notes.Trash")} placement="right">
            <IconButton
              size="small"
              onClick={handleTrash}
              className={isTrashActive ? styles.collapsedNavActive : ""}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box className={styles.collapsedDivider} />
        <Box className={styles.collapsedNav}>
          <Tooltip title={t("Folders.Folders")} placement="right">
            <IconButton size="small" onClick={() => setIsFolderDialogOpen(true)}>
              <FolderOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("Tags.Tags")} placement="right">
            <IconButton size="small" onClick={() => setIsTagDialogOpen(true)}>
              <LocalOfferOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box className={styles.sidebar}>
        {/* Collapse Toggle - hidden on mobile */}
        {!isMobile && (
          <Box className={styles.collapseToggle}>
            <Tooltip title={t("Common.CollapseSidebar")}>
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Quick Filters */}
        <Box className={styles.section}>
          <Box
            className={styles.navItem}
            onClick={handleAllNotes}
          >
            <NoteOutlinedIcon fontSize="small" className={styles.navItemIcon} />
            <Typography className={styles.navItemLabel}>{t("Notes.AllNotes")}</Typography>
            <span className={styles.navItemCount}>{allNotesCount}</span>
          </Box>

          <Box
            className={styles.navItem}
            onClick={handleFavorites}
          >
            <StarOutlineIcon fontSize="small" className={styles.navItemIcon} />
            <Typography className={styles.navItemLabel}>{t("Notes.Favorites")}</Typography>
            <span className={styles.navItemCount}>{favoritesCount}</span>
          </Box>

          <Box
            className={styles.navItem}
            onClick={handleTrash}
          >
            <DeleteOutlineIcon
              fontSize="small"
              className={styles.navItemIcon}
            />
            <Typography className={styles.navItemLabel}>{t("Notes.Trash")}</Typography>
            <span className={styles.navItemCount}>{trashCount}</span>
          </Box>
        </Box>

        {/* Recent */}
        <Box className={styles.section}>
          <Box className={styles.sectionHeader}>
            <Typography className={styles.sectionTitle}>{t("Notes.Recent")}</Typography>
            <IconButton
              size="small"
              onClick={() => setRecentExpanded(!recentExpanded)}
            >
              {recentExpanded ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
          <Collapse in={recentExpanded}>
            <Box className={styles.recentList} style={{ maxHeight: recentHeight }}>
              {recentNotes.map((note) => (
                <Box
                  key={note.id}
                  className={`${styles.navItem} ${selectedNoteId === note.id ? styles.navItemActive : ""}`}
                  onClick={() => dispatch(setSelectedNote(note.id))}
                >
                  <AccessTimeIcon fontSize="small" className={styles.navItemIcon} />
                  <Typography className={styles.navItemLabel} noWrap>
                    {note.title || t("Common.Untitled")}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box
              className={`${styles.verticalResizeHandle} ${resizingRecent ? styles.verticalResizeHandleActive : ''}`}
              onMouseDown={handleRecentResizeStart}
            />
          </Collapse>
        </Box>

        {/* Folders */}
        <Box className={styles.section}>
          <Box className={styles.sectionHeader}>
            <Typography className={styles.sectionTitle}>{t("Folders.Folders")}</Typography>
            <Box className={styles.sectionActions}>
              <Tooltip
                title={areAllFoldersExpanded ? t("Folders.CollapseAll") : t("Folders.ExpandAll")}
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={handleToggleExpandAll}
                    disabled={allFolders.length === 0}
                  >
                    {areAllFoldersExpanded ? (
                      <UnfoldLessIcon fontSize="small" />
                    ) : (
                      <UnfoldMoreIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  showTreeView ? t("Folders.ShowFoldersOnly") : t("Folders.ShowTreeWithNotes")
                }
              >
                <IconButton
                  size="small"
                  onClick={() => setShowTreeView(!showTreeView)}
                >
                  {showTreeView ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title={t("Folders.NewFolder")}>
                <IconButton
                  size="small"
                  onClick={() => setIsFolderDialogOpen(true)}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {isFoldersLoading ? (
            <Box className={styles.loadingContainer}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            rootFolders.map((folder) => (
              <DroppableFolder
                key={folder.id}
                folder={folder}
                showNotes={showTreeView}
                onAddSubfolder={handleOpenSubfolderDialog}
              />
            ))
          )}

          {/* Unfiled notes - only in tree view */}
          {showTreeView && (
            <UnfiledDropZone>
              {unfiledNotes.length > 0 && (
                <>
                  <Box className={styles.unfiledHeader}>
                    <DescriptionOutlinedIcon
                      fontSize="small"
                      className={styles.unfiledIcon}
                    />
                    <Typography className={styles.unfiledLabel}>
                      {t("Notes.Unfiled")}
                    </Typography>
                    <span className={styles.navItemCount}>
                      {unfiledNotes.length}
                    </span>
                  </Box>
                  <SortableContext
                    items={unfiledNoteIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {unfiledNotes.map((note) => (
                      <SortableNote key={note.id} note={note} level={1} />
                    ))}
                  </SortableContext>
                </>
              )}
              {unfiledNotes.length === 0 && rootFolders.length > 0 && (
                <Box className={styles.unfiledDropHint}>
                  {t("Notes.DropToRemoveFromFolder")}
                </Box>
              )}
            </UnfiledDropZone>
          )}

          {rootFolders.length === 0 && !showTreeView && (
            <Box
              className={styles.addButton}
              onClick={() => setIsFolderDialogOpen(true)}
            >
              <AddIcon fontSize="small" />
              <span>{t("Folders.AddFolder")}</span>
            </Box>
          )}
        </Box>

        {/* Tags */}
        <Box className={styles.section}>
          <Box className={styles.sectionHeader}>
            <Typography className={styles.sectionTitle}>{t("Tags.Tags")}</Typography>
            <Tooltip title={t("Tags.NewTag")}>
              <IconButton size="small" onClick={() => setIsTagDialogOpen(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box className={styles.tagsContainer}>
            {isTagsLoading ? (
              <Box className={styles.loadingContainerSmall}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <>
                {tags.map((tag) => (
                  <Box key={tag.id} className={styles.tagItemWrapper}>
                    <Box
                      className={styles.tagItem}
                      onClick={() => handleTagClick(tag.id)}
                      sx={{
                        backgroundColor: filter.tagIds.includes(tag.id)
                          ? tag.color
                          : "transparent",
                        color: filter.tagIds.includes(tag.id)
                          ? "white"
                          : "inherit",
                        border: `1px solid ${tag.color}`,
                      }}
                    >
                      <span
                        className={styles.tagDot}
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Box>
                    <Box className={styles.tagActions}>
                      <Tooltip title={t("Tags.EditTag")}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenEditTag(tag.id, e)}
                          className={styles.tagActionButton}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("Tags.DeleteTag")}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteTag(tag.id, e)}
                          className={styles.tagActionButton}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}

                {tags.length === 0 && (
                  <Box
                    className={styles.addButton}
                    onClick={() => setIsTagDialogOpen(true)}
                  >
                    <LocalOfferOutlinedIcon fontSize="small" />
                    <span>{t("Tags.AddTag")}</span>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Create Folder Dialog */}
        <Dialog open={isFolderDialogOpen} onClose={handleCloseFolderDialog}>
          <DialogTitle>
            {parentFolderForCreate
              ? `${t("Folders.CreateFolder")} - ${parentFolderForCreate.name}`
              : t("Folders.CreateFolder")}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={t("Folders.FolderName")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className={styles.dialogTextField}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFolderDialog}>{t("Common.Cancel")}</Button>
            <Button onClick={handleCreateFolder} variant="contained">
              {t("Common.Create")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Tag Dialog */}
        <Dialog
          open={isTagDialogOpen}
          onClose={() => setIsTagDialogOpen(false)}
        >
          <DialogTitle>{t("Tags.CreateTag")}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={t("Tags.TagName")}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              className={styles.dialogTextFieldWithMargin}
            />
            <Box className={styles.colorPickerRow}>
              <Typography>{t("Tags.Color")}</Typography>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className={styles.colorPicker}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsTagDialogOpen(false)}>{t("Common.Cancel")}</Button>
            <Button onClick={handleCreateTag} variant="contained">
              {t("Common.Create")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Tag Dialog */}
        <Dialog open={isEditTagDialogOpen} onClose={handleCloseEditTagDialog}>
          <DialogTitle>{t("Tags.EditTag")}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={t("Tags.TagName")}
              value={editTagName}
              onChange={(e) => setEditTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateTag()}
              className={styles.dialogTextFieldWithMargin}
            />
            <Box className={styles.colorPickerRow}>
              <Typography>{t("Tags.Color")}</Typography>
              <input
                type="color"
                value={editTagColor}
                onChange={(e) => setEditTagColor(e.target.value)}
                className={styles.colorPicker}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditTagDialog}>{t("Common.Cancel")}</Button>
            <Button onClick={handleUpdateTag} variant="contained">
              {t("Common.Save")}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeNote && (
          <Box className={styles.dragOverlay}>
            <DescriptionOutlinedIcon fontSize="small" />
            <Typography noWrap>{activeNote.title || t("Common.Untitled")}</Typography>
          </Box>
        )}
        {activeFolder && (
          <Box className={styles.folderDragOverlay}>
            <FolderOutlinedIcon
              fontSize="small"
              sx={{ color: activeFolder.color }}
            />
            <Typography noWrap>{activeFolder.name}</Typography>
          </Box>
        )}
      </DragOverlay>
    </DndContext>
  );
};
