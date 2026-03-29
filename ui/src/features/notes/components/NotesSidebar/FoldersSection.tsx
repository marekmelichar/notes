import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import AddIcon from '@mui/icons-material/Add';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectRootFolders,
  selectExpandedFolderIds,
  selectFoldersLoading,
  selectAllFolders,
  expandFolder,
  setExpandedFolders,
  createFolder,
} from '../../store/foldersSlice';
import type { Folder, NoteListItem } from '../../types';
import { DroppableFolder } from './DroppableFolder';
import { SortableNote } from './SortableNote';
import { UnfiledDropZone } from './UnfiledDropZone';
import { FolderMoveDialog } from './FolderMoveDialog';
import styles from './index.module.css';

interface FoldersSectionProps {
  unfiledNotes: NoteListItem[];
  unfiledNoteIds: string[];
  skipAnimationRef: React.RefObject<boolean>;
}

export const FoldersSection = ({
  unfiledNotes,
  unfiledNoteIds,
  skipAnimationRef,
}: FoldersSectionProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allFolders = useAppSelector(selectAllFolders);
  const rootFolders = useAppSelector(selectRootFolders);
  const expandedIds = useAppSelector(selectExpandedFolderIds);
  const isFoldersLoading = useAppSelector(selectFoldersLoading);

  const [showTreeView, setShowTreeView] = useState(true);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderIdForCreate, setParentFolderIdForCreate] = useState<string | null>(null);
  const [movingFolder, setMovingFolder] = useState<Folder | null>(null);

  const parentFolderForCreate = parentFolderIdForCreate
    ? allFolders.find((f) => f.id === parentFolderIdForCreate)
    : null;

  const areAllFoldersExpanded =
    allFolders.length > 0 && allFolders.every((f) => expandedIds.includes(f.id));

  const handleToggleExpandAll = () => {
    if (areAllFoldersExpanded) {
      dispatch(setExpandedFolders([]));
    } else {
      dispatch(setExpandedFolders(allFolders.map((f) => f.id)));
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      dispatch(createFolder({ name: newFolderName.trim(), parentId: parentFolderIdForCreate }));
      setNewFolderName('');
      setParentFolderIdForCreate(null);
      setIsFolderDialogOpen(false);
      if (parentFolderIdForCreate) {
        dispatch(expandFolder(parentFolderIdForCreate));
      }
    }
  };

  const handleOpenSubfolderDialog = useCallback((parentId: string) => {
    setParentFolderIdForCreate(parentId);
    setIsFolderDialogOpen(true);
  }, []);

  const handleCloseFolderDialog = () => {
    setNewFolderName('');
    setParentFolderIdForCreate(null);
    setIsFolderDialogOpen(false);
  };

  const handleMoveFolder = useCallback((folder: Folder) => {
    setMovingFolder(folder);
  }, []);

  return (
    <Box className={styles.section}>
      <Box className={styles.sectionHeader}>
        <Typography className={styles.sectionTitle}>{t('Folders.Folders')}</Typography>
        <Box className={styles.sectionActions}>
          <Tooltip title={areAllFoldersExpanded ? t('Folders.CollapseAll') : t('Folders.ExpandAll')}>
            <span>
              <IconButton
                size="small"
                onClick={handleToggleExpandAll}
                disabled={allFolders.length === 0}
                data-testid="folders-expand-all"
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
            title={showTreeView ? t('Folders.ShowFoldersOnly') : t('Folders.ShowTreeWithNotes')}
          >
            <IconButton size="small" onClick={() => setShowTreeView(!showTreeView)} data-testid="folders-tree-toggle">
              {showTreeView ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('Folders.NewFolder')}>
            <IconButton size="small" onClick={() => setIsFolderDialogOpen(true)} data-testid="folders-new-button">
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
            onMoveFolder={handleMoveFolder}
            skipAnimationRef={skipAnimationRef}
          />
        ))
      )}

      {showTreeView && (
        <UnfiledDropZone>
          {unfiledNotes.length > 0 && (
            <>
              <Box className={styles.unfiledHeader}>
                <DescriptionOutlinedIcon fontSize="small" className={styles.unfiledIcon} />
                <Typography className={styles.unfiledLabel}>{t('Notes.Unfiled')}</Typography>
                <span className={styles.navItemCount}>{unfiledNotes.length}</span>
              </Box>
              <SortableContext items={unfiledNoteIds} strategy={verticalListSortingStrategy}>
                {unfiledNotes.map((note) => (
                  <SortableNote key={note.id} note={note} level={1} />
                ))}
              </SortableContext>
            </>
          )}
          {unfiledNotes.length === 0 && rootFolders.length > 0 && (
            <Box className={styles.unfiledDropHint}>{t('Notes.DropToRemoveFromFolder')}</Box>
          )}
        </UnfiledDropZone>
      )}

      {rootFolders.length === 0 && !showTreeView && (
        <Box className={styles.addButton} onClick={() => setIsFolderDialogOpen(true)}>
          <AddIcon fontSize="small" />
          <span>{t('Folders.AddFolder')}</span>
        </Box>
      )}

      {/* Create folder dialog */}
      <Dialog open={isFolderDialogOpen} onClose={handleCloseFolderDialog}>
        <DialogTitle>
          {parentFolderForCreate
            ? `${t('Folders.CreateFolder')} - ${parentFolderForCreate.name}`
            : t('Folders.CreateFolder')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t('Folders.FolderName')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            className={styles.dialogTextField}
            data-testid="folders-create-name"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFolderDialog} data-testid="folders-create-cancel">{t('Common.Cancel')}</Button>
          <Button onClick={handleCreateFolder} variant="contained" data-testid="folders-create-submit">
            {t('Common.Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move folder dialog */}
      {movingFolder && (
        <FolderMoveDialog
          folder={movingFolder}
          onClose={() => setMovingFolder(null)}
        />
      )}
    </Box>
  );
};
