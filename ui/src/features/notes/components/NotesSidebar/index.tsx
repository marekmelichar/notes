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
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import NoteOutlinedIcon from "@mui/icons-material/NoteOutlined";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useAppDispatch, useAppSelector, toggleSidebarCollapsed, openTab, selectActiveTabId, selectIsMobile, selectNoteListHidden } from "@/store";
import { setNoteListHidden } from "@/store/uiSlice";
import {
  setFilter,
  resetFilter,
  selectNotesFilter,
  selectAllNotes,
  updateNote,
  reorderNotes,
} from "../../store/notesSlice";
import {
  selectRootFolders,
  selectExpandedFolderIds,
  selectFoldersLoading,
  selectAllFolders,
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
import { SortableNote } from "./SortableNote";
import { DroppableFolder } from "./DroppableFolder";
import { UnfiledDropZone } from "./UnfiledDropZone";
import { TagFormDialog } from "./TagFormDialog";
import styles from "./index.module.css";

const RECENT_NOTES_LIMIT = 5;

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
  const skipAnimationRef = useRef(false);
  const tags = useAppSelector(selectAllTags);
  const selectedNoteId = useAppSelector(selectActiveTabId);
  const isFoldersLoading = useAppSelector(selectFoldersLoading);
  const isTagsLoading = useAppSelector(selectTagsLoading);
  const isMobile = useAppSelector(selectIsMobile);
  const noteListHidden = useAppSelector(selectNoteListHidden);

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isEditTagDialogOpen, setIsEditTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
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

  const editingTag = editingTagId ? tags.find((t) => t.id === editingTagId) : undefined;

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
        skipAnimationRef.current = true;
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
          skipAnimationRef.current = false;
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

  const handleCreateTag = (name: string, color: string) => {
    dispatch(createTag({ name, color }));
    setIsTagDialogOpen(false);
  };

  const handleOpenEditTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTagId(tagId);
    setIsEditTagDialogOpen(true);
  };

  const handleCloseEditTagDialog = () => {
    setIsEditTagDialogOpen(false);
    setEditingTagId(null);
  };

  const handleUpdateTag = (name: string, color: string) => {
    if (editingTagId) {
      dispatch(updateTag({ id: editingTagId, updates: { name, color } }));
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
                  onClick={() => dispatch(openTab(note.id))}
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
                skipAnimationRef={skipAnimationRef}
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
        <TagFormDialog
          open={isTagDialogOpen}
          onClose={() => setIsTagDialogOpen(false)}
          onSubmit={handleCreateTag}
          mode="create"
        />

        {/* Edit Tag Dialog */}
        <TagFormDialog
          open={isEditTagDialogOpen}
          onClose={handleCloseEditTagDialog}
          onSubmit={handleUpdateTag}
          initialName={editingTag?.name}
          initialColor={editingTag?.color}
          mode="edit"
        />
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
