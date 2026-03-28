import React, { useMemo, useState, useRef, useCallback } from "react";
import { Box, Typography, IconButton, Collapse, Tooltip, InputBase } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useAppDispatch, useAppSelector, selectIsMobile } from "@/store";
import {
  setFilter,
} from "../../store/notesSlice";
import {
  selectChildFolders,
  selectExpandedFolderIds,
  toggleFolderExpanded,
  expandFolder,
  updateFolder,
} from "../../store/foldersSlice";
import { selectAllNotes } from "../../store/notesSlice";
import type { Folder } from "../../types";
import { SortableNote } from "./SortableNote";
import styles from "./index.module.css";

export interface DroppableFolderProps {
  folder: Folder;
  level?: number;
  showNotes?: boolean;
  onAddSubfolder: (parentId: string) => void;
  skipAnimationRef: React.RefObject<boolean>;
}

export const DroppableFolder = React.memo(({
  folder,
  level = 0,
  showNotes = false,
  onAddSubfolder,
  skipAnimationRef,
}: DroppableFolderProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector(selectIsMobile);
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

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleRenameStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameName(folder.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, [folder.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameName.trim();
    if (trimmed && trimmed !== folder.name) {
      dispatch(updateFolder({ id: folder.id, updates: { name: trimmed } }));
    }
    setIsRenaming(false);
  }, [dispatch, folder.id, folder.name, renameName]);

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false);
    setRenameName(folder.name);
  }, [folder.name]);

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
        <Box {...listeners} {...attributes} className={styles.dragHandle}>
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
        {isRenaming ? (
          <InputBase
            inputRef={renameInputRef}
            autoFocus
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') handleRenameCancel();
              e.stopPropagation();
            }}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className={styles.folderRenameInput}
            inputProps={{ className: styles.folderRenameInputInner }}
          />
        ) : (
          <Typography className={styles.folderItemLabel}>
            {folder.name}
          </Typography>
        )}
        {folderNotes.length > 0 && (
          <span className={styles.navItemCount}>{folderNotes.length}</span>
        )}
        <Tooltip title={t("Folders.EditFolder")}>
          <IconButton
            size="small"
            className={styles.addSubfolderButton}
            onClick={handleRenameStart}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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

      <Collapse in={isExpanded} timeout={skipAnimationRef.current ? 0 : "auto"}>
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
            skipAnimationRef={skipAnimationRef}
          />
        ))}
      </Collapse>
    </>
  );
});

DroppableFolder.displayName = 'DroppableFolder';
