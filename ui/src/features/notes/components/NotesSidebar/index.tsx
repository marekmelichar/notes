import React, { useState, useEffect, useMemo } from "react";
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
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useAppDispatch, useAppSelector } from "@/store";
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
  toggleFolderExpanded,
  expandFolder,
  createFolder,
} from "../../store/foldersSlice";
import { selectAllTags, selectTagsLoading, createTag } from "../../store/tagsSlice";
import type { Folder, Note } from "../../types";
import styles from "./index.module.css";

interface SortableNoteProps {
  note: Note;
  level: number;
}

const SortableNote = ({ note, level }: SortableNoteProps) => {
  const dispatch = useAppDispatch();
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isSelected = selectedNoteId === note.id;

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: 12 + level * 20,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    // Only select the note - don't change the filter
    // The tree view already shows folder context visually
    dispatch(setSelectedNote(note.id));
  };

  return (
    <Box
      ref={setNodeRef}
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
        {note.title || "Untitled"}
      </Typography>
    </Box>
  );
};

interface DroppableFolderProps {
  folder: Folder;
  level?: number;
  showNotes?: boolean;
}

const DroppableFolder = ({
  folder,
  level = 0,
  showNotes = false,
}: DroppableFolderProps) => {
  const dispatch = useAppDispatch();
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const childFolders = useAppSelector(selectChildFolders(folder.id));
  const notes = useAppSelector(selectAllNotes);

  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id },
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

  return (
    <>
      <Box
        ref={setNodeRef}
        className={`${styles.folderItem} ${isOver ? styles.dropTarget : ""}`}
        style={{ paddingLeft: 12 + level * 20 }}
        onClick={handleClick}
      >
        <Box className={styles.folderItemIcon}>
          {hasChildren ? (
            <IconButton size="small" onClick={handleToggleExpand} className={styles.expandButton}>
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
      </Box>

      <Collapse in={isExpanded}>
        {childFolders.map((child) => (
          <DroppableFolder
            key={child.id}
            folder={child}
            level={level + 1}
            showNotes={showNotes}
          />
        ))}
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

export const NotesSidebar = () => {
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectNotesFilter);
  const notes = useAppSelector(selectAllNotes);
  const rootFolders = useAppSelector(selectRootFolders);
  const tags = useAppSelector(selectAllTags);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isFoldersLoading = useAppSelector(selectFoldersLoading);
  const isTagsLoading = useAppSelector(selectTagsLoading);

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [showTreeView, setShowTreeView] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

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

  useEffect(() => {
    if (selectedNoteId) {
      const selectedNote = notes.find((n) => n.id === selectedNoteId);
      if (selectedNote?.folderId) {
        dispatch(expandFolder(selectedNote.folderId));
      }
    }
  }, [selectedNoteId, notes, dispatch]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "note") {
      setActiveNote(active.data.current.note);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNote(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

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
              updates: { folderId: overNote.folderId ?? '' },
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
          dispatch(updateNote({ id: note.id, updates: { folderId: '' } }));
        }
        return;
      }
    }
  };

  const allNotesCount = notes.filter((n) => !n.isDeleted).length;
  const favoritesCount = notes.filter((n) => n.isPinned && !n.isDeleted).length;
  const trashCount = notes.filter((n) => n.isDeleted).length;

  const handleAllNotes = () => {
    dispatch(resetFilter());
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
      dispatch(createFolder({ name: newFolderName.trim() }));
      setNewFolderName("");
      setIsFolderDialogOpen(false);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      dispatch(createTag({ name: newTagName.trim(), color: newTagColor }));
      setNewTagName("");
      setNewTagColor("#6366f1");
      setIsTagDialogOpen(false);
    }
  };

  const isAllNotesActive =
    !filter.isDeleted && filter.isPinned === null && filter.folderId === null;
  const isFavoritesActive = filter.isPinned === true && !filter.isDeleted;
  const isTrashActive = filter.isDeleted;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box className={styles.sidebar}>
        {/* Quick Filters */}
        <Box className={styles.section}>
          <Box
            className={`${styles.navItem} ${isAllNotesActive ? styles.navItemActive : ""}`}
            onClick={handleAllNotes}
          >
            <NoteOutlinedIcon fontSize="small" className={styles.navItemIcon} />
            <Typography className={styles.navItemLabel}>All Notes</Typography>
            <span className={styles.navItemCount}>{allNotesCount}</span>
          </Box>

          <Box
            className={`${styles.navItem} ${isFavoritesActive ? styles.navItemActive : ""}`}
            onClick={handleFavorites}
          >
            <StarOutlineIcon fontSize="small" className={styles.navItemIcon} />
            <Typography className={styles.navItemLabel}>Favorites</Typography>
            <span className={styles.navItemCount}>{favoritesCount}</span>
          </Box>

          <Box
            className={`${styles.navItem} ${isTrashActive ? styles.navItemActive : ""}`}
            onClick={handleTrash}
          >
            <DeleteOutlineIcon
              fontSize="small"
              className={styles.navItemIcon}
            />
            <Typography className={styles.navItemLabel}>Trash</Typography>
            <span className={styles.navItemCount}>{trashCount}</span>
          </Box>
        </Box>

        {/* Folders */}
        <Box className={styles.section}>
          <Box className={styles.sectionHeader}>
            <Typography className={styles.sectionTitle}>Folders</Typography>
            <Box className={styles.sectionActions}>
              <Tooltip
                title={
                  showTreeView ? "Show folders only" : "Show tree with notes"
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
              <Tooltip title="New Folder">
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
                      Unfiled
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
                  Drop here to remove from folder
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
              <span>Add folder</span>
            </Box>
          )}
        </Box>

        {/* Tags */}
        <Box className={styles.section}>
          <Box className={styles.sectionHeader}>
            <Typography className={styles.sectionTitle}>Tags</Typography>
            <Tooltip title="New Tag">
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
                  <Box
                    key={tag.id}
                    className={styles.tagItem}
                    onClick={() => handleTagClick(tag.id)}
                    sx={{
                      backgroundColor: filter.tagIds.includes(tag.id)
                        ? tag.color
                        : "transparent",
                      color: filter.tagIds.includes(tag.id) ? "white" : "inherit",
                      border: `1px solid ${tag.color}`,
                    }}
                  >
                    <span
                      className={styles.tagDot}
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </Box>
                ))}

                {tags.length === 0 && (
                  <Box
                    className={styles.addButton}
                    onClick={() => setIsTagDialogOpen(true)}
                  >
                    <LocalOfferOutlinedIcon fontSize="small" />
                    <span>Add tag</span>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* Create Folder Dialog */}
        <Dialog
          open={isFolderDialogOpen}
          onClose={() => setIsFolderDialogOpen(false)}
        >
          <DialogTitle>Create Folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className={styles.dialogTextField}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Tag Dialog */}
        <Dialog
          open={isTagDialogOpen}
          onClose={() => setIsTagDialogOpen(false)}
        >
          <DialogTitle>Create Tag</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className={styles.dialogTextFieldWithMargin}
            />
            <Box className={styles.colorPickerRow}>
              <Typography>Color:</Typography>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className={styles.colorPicker}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTag} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeNote && (
          <Box className={styles.dragOverlay}>
            <DescriptionOutlinedIcon fontSize="small" />
            <Typography noWrap>{activeNote.title || "Untitled"}</Typography>
          </Box>
        )}
      </DragOverlay>
    </DndContext>
  );
};
