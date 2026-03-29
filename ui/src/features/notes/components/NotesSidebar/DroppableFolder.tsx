import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  InputBase,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Popover,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAppDispatch, useAppSelector, selectIsMobile } from "@/store";
import { setFilter } from "../../store/notesSlice";
import {
  selectChildFolders,
  selectExpandedFolderIds,
  selectAllFolders,
  toggleFolderExpanded,
  expandFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
} from "../../store/foldersSlice";
import { selectAllNotes } from "../../store/notesSlice";
import type { Folder } from "../../types";
import { SortableNote } from "./SortableNote";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import styles from "./index.module.css";

export interface DroppableFolderProps {
  folder: Folder;
  level?: number;
  showNotes?: boolean;
  onAddSubfolder: (parentId: string) => void;
  onMoveFolder: (folder: Folder) => void;
  skipAnimationRef: React.RefObject<boolean>;
}

export const DroppableFolder = React.memo(({
  folder,
  level = 0,
  showNotes = false,
  onAddSubfolder,
  onMoveFolder,
  skipAnimationRef,
}: DroppableFolderProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector(selectIsMobile);
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const childFolders = useAppSelector(selectChildFolders(folder.id));
  const allFolders = useAppSelector(selectAllFolders);
  const notes = useAppSelector(selectAllNotes);

  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folderId: folder.id, folder },
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

  // Siblings for move up/down
  const siblings = useMemo(() => {
    return allFolders
      .filter((f) => f.parentId === folder.parentId)
      .sort((a, b) => a.order - b.order);
  }, [allFolders, folder.parentId]);
  const siblingIndex = siblings.findIndex((f) => f.id === folder.id);
  const canMoveUp = siblingIndex > 0;
  const canMoveDown = siblingIndex < siblings.length - 1;

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

  // --- Context menu ---
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  // --- Rename ---
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleRenameStart = useCallback(() => {
    handleMenuClose();
    setRenameName(folder.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, [folder.name, handleMenuClose]);

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

  // --- Color picker ---
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);

  const handleColorStart = useCallback((e: React.MouseEvent<HTMLElement>) => {
    handleMenuClose();
    // Use the menu anchor's parent (the folder row) as popover anchor
    setColorAnchor(e.currentTarget);
  }, [handleMenuClose]);

  const handleColorSelect = useCallback((color: string) => {
    (document.activeElement as HTMLElement)?.blur();
    setColorAnchor(null);
    dispatch(updateFolder({ id: folder.id, updates: { color } }));
  }, [dispatch, folder.id]);

  // --- Move up/down ---
  const handleMoveUp = useCallback(() => {
    handleMenuClose();
    if (!canMoveUp) return;
    const reordered = [...siblings];
    [reordered[siblingIndex - 1], reordered[siblingIndex]] = [reordered[siblingIndex], reordered[siblingIndex - 1]];
    dispatch(reorderFolders(reordered.map((f) => f.id)));
  }, [handleMenuClose, canMoveUp, siblings, siblingIndex, dispatch]);

  const handleMoveDown = useCallback(() => {
    handleMenuClose();
    if (!canMoveDown) return;
    const reordered = [...siblings];
    [reordered[siblingIndex], reordered[siblingIndex + 1]] = [reordered[siblingIndex + 1], reordered[siblingIndex]];
    dispatch(reorderFolders(reordered.map((f) => f.id)));
  }, [handleMenuClose, canMoveDown, siblings, siblingIndex, dispatch]);

  // --- Move to... ---
  const handleMoveTo = useCallback(() => {
    handleMenuClose();
    onMoveFolder(folder);
  }, [handleMenuClose, onMoveFolder, folder]);

  // --- Add subfolder ---
  const handleAddSubfolder = useCallback(() => {
    handleMenuClose();
    onAddSubfolder(folder.id);
  }, [handleMenuClose, onAddSubfolder, folder.id]);

  // --- Delete ---
  const handleDelete = useCallback(() => {
    handleMenuClose();
    dispatch(deleteFolder(folder.id));
  }, [handleMenuClose, dispatch, folder.id]);

  const step = isMobile ? 10 : 30;
  const style = {
    paddingLeft: level > 0 ? step + level * step : 12,
    "--indent-level": level,
  } as React.CSSProperties;

  return (
    <>
      <Box
        ref={setNodeRef}
        className={`${styles.folderItem} ${isOver ? styles.dropTarget : ""}`}
        style={style}
        onClick={handleClick}
      >
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
        <IconButton
          size="small"
          className={styles.addSubfolderButton}
          onClick={handleMenuOpen}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleRenameStart}>
          <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.Rename")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleColorStart}>
          <ListItemIcon><PaletteOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.ChangeColor")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddSubfolder}>
          <ListItemIcon><CreateNewFolderOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.AddSubfolder")}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMoveTo}>
          <ListItemIcon><DriveFileMoveOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.MoveTo")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMoveUp} disabled={!canMoveUp}>
          <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.MoveUp")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMoveDown} disabled={!canMoveDown}>
          <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t("Folders.MoveDown")}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>{t("Common.Delete")}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Color picker popover */}
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
        disableAutoFocus
        disableRestoreFocus
      >
        <ColorSwatchPicker
          selected={folder.color}
          size="small"
          onSelect={handleColorSelect}
        />
      </Popover>

      <Collapse in={isExpanded} timeout={skipAnimationRef.current ? 0 : "auto"}>
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
        {childFolders.map((child) => (
          <DroppableFolder
            key={child.id}
            folder={child}
            level={level + 1}
            showNotes={showNotes}
            onAddSubfolder={onAddSubfolder}
            onMoveFolder={onMoveFolder}
            skipAnimationRef={skipAnimationRef}
          />
        ))}
      </Collapse>
    </>
  );
});

DroppableFolder.displayName = 'DroppableFolder';
