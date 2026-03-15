import React, { useCallback, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestoreIcon from '@mui/icons-material/Restore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import HtmlOutlinedIcon from '@mui/icons-material/HtmlOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { Note, NoteListItem, Folder } from '../../types';
import type { ExportFormat } from './TiptapEditor';
import { TagPicker } from '../TagPicker';
import styles from './index.module.css';

interface EditorHeaderProps {
  note: Note | NoteListItem;
  title: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isMobile: boolean;
  viewMode: 'editor' | 'markdown';
  onViewModeChange: (mode: 'editor' | 'markdown') => void;
  folders: Folder[];
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onFolderChange: (folderId: string | null) => void;
  onTagsChange: (tagIds: string[]) => void;
  onExport: (format: ExportFormat) => Promise<void>;
}

export const EditorHeader = ({
  note,
  title,
  onTitleChange,
  isMobile,
  viewMode,
  onViewModeChange,
  folders,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onTogglePin,
  onDelete,
  onRestore,
  onFolderChange,
  onTagsChange,
  onExport,
}: EditorHeaderProps) => {
  const { t } = useTranslation();

  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showMobileTags, setShowMobileTags] = useState(false);
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<HTMLElement | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<HTMLElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentFolder = folders.find((f) => f.id === note.folderId);

  const handleFolderMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFolderMenuAnchor(event.currentTarget);
  }, []);

  const handleFolderMenuClose = useCallback(() => {
    setFolderMenuAnchor(null);
  }, []);

  const handleFolderSelect = useCallback(
    (folderId: string | null) => {
      onFolderChange(folderId);
      setFolderMenuAnchor(null);
    },
    [onFolderChange],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExportMenuAnchor(null);
      setIsExporting(true);
      try {
        await onExport(format);
      } finally {
        setIsExporting(false);
      }
    },
    [onExport],
  );

  return (
    <Box className={`${styles.header} ${isMobile ? `${styles.headerMobile} ${!showMobileControls ? styles.headerMobileCollapsed : ''}` : ''}`}>
      {/* Row 1: Title + toggle on mobile */}
      <Box className={styles.titleRow}>
        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={onTitleChange}
          placeholder={t('Common.Untitled')}
          autoComplete="off"
        />
        {isMobile && (
          <Tooltip title={t('Notes.Controls')}>
            <IconButton
              data-testid="editor-controls-toggle"
              aria-label={t('Notes.Controls')}
              size="small"
              onClick={() => setShowMobileControls(!showMobileControls)}
              color={showMobileControls ? 'primary' : 'default'}
              className={styles.controlsToggle}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Row 2: Actions — always on desktop, collapsible on mobile */}
      <Box
        className={`${styles.headerActions} ${isMobile ? (showMobileControls ? styles.controlsOpen : styles.controlsCollapsed) : ''}`}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
          size="small"
          className={styles.viewToggle}
          data-testid="editor-view-toggle"
        >
          <ToggleButton value="editor" data-testid="editor-view-editor" aria-label={t('View.Editor')}>
            <Tooltip title={t('View.Editor')}>
              <EditOutlinedIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="markdown" data-testid="editor-view-markdown" aria-label={t('View.Preview')}>
            <Tooltip title={t('View.Preview')}>
              <CodeOutlinedIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={t('Notes.MoveToFolder')}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={handleFolderMenuOpen}
            startIcon={<FolderIcon fontSize="small" />}
            className={styles.folderButton}
            data-testid="editor-folder-button"
          >
            {currentFolder?.name || t('Notes.NoFolder')}
          </Button>
        </Tooltip>
        <Menu
          anchorEl={folderMenuAnchor}
          open={Boolean(folderMenuAnchor)}
          onClose={handleFolderMenuClose}
          data-testid="editor-folder-menu"
        >
          <MenuItem onClick={() => handleFolderSelect(null)} selected={!note.folderId} data-testid="editor-folder-none">
            <ListItemIcon>
              <FolderOpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('Notes.NoFolder')}</ListItemText>
          </MenuItem>
          {folders.map((folder) => (
            <MenuItem
              key={folder.id}
              onClick={() => handleFolderSelect(folder.id)}
              selected={note.folderId === folder.id}
              data-testid={`editor-folder-${folder.id}`}
            >
              <ListItemIcon>
                <FolderIcon fontSize="small" sx={{ color: folder.color }} />
              </ListItemIcon>
              <ListItemText>{folder.name}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title={t('Notes.SaveShortcut')}>
          <span>
            <Button
              size="small"
              variant={hasUnsavedChanges ? 'contained' : 'outlined'}
              color={hasUnsavedChanges ? 'primary' : 'inherit'}
              onClick={onSave}
              disabled={isSaving}
              startIcon={
                isSaving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveIcon fontSize="small" />
                )
              }
              className={styles.saveButton}
              data-testid="editor-save-button"
            >
              {isSaving
                ? t('Common.Saving')
                : hasUnsavedChanges
                  ? t('Common.Save')
                  : t('Common.Saved')}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={note.isPinned ? t('Notes.Unpin') : t('Notes.Pin')}>
          <IconButton size="small" aria-label={note.isPinned ? t('Notes.Unpin') : t('Notes.Pin')} data-testid="editor-pin-button" onClick={onTogglePin}>
            {note.isPinned ? (
              <PushPinIcon fontSize="small" color="primary" />
            ) : (
              <PushPinOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Export.Export')}>
          <span>
            <IconButton
              size="small"
              aria-label={t('Export.Export')}
              data-testid="editor-export-button"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              disabled={isExporting}
            >
              {isExporting ? (
                <CircularProgress size={18} />
              ) : (
                <FileDownloadOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
          data-testid="editor-export-menu"
        >
          <MenuItem onClick={() => handleExport('markdown')} data-testid="editor-export-markdown">
            <ListItemIcon>
              <CodeOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('Export.Markdown')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExport('html')} data-testid="editor-export-html">
            <ListItemIcon>
              <HtmlOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('Export.HTML')}</ListItemText>
          </MenuItem>
        </Menu>
        {isMobile ? (
          <Tooltip title={t('Tags.Tags')}>
            <IconButton
              size="small"
              aria-label={t('Tags.Tags')}
              data-testid="editor-tags-toggle"
              onClick={() => setShowMobileTags(!showMobileTags)}
              color={showMobileTags || note.tags.length > 0 ? 'primary' : 'default'}
            >
              <LocalOfferOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <TagPicker selectedTagIds={note.tags} onTagsChange={onTagsChange} />
        )}
        <Box className={styles.actionSpacer} />
        {note.isDeleted ? (
          <Tooltip title={t('Notes.Restore')}>
            <IconButton size="small" aria-label={t('Notes.Restore')} data-testid="editor-restore-button" onClick={onRestore} color="success">
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t('Common.Delete')}>
            <IconButton size="small" aria-label={t('Common.Delete')} data-testid="editor-delete-button" onClick={onDelete} color="error">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Row 3: Tags (mobile only - toggleable) */}
      {isMobile && showMobileTags && showMobileControls && (
        <Box className={styles.headerTags}>
          <TagPicker selectedTagIds={note.tags} onTagsChange={onTagsChange} />
        </Box>
      )}
    </Box>
  );
};
