import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
} from '@mui/material';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectAllFolders,
  updateFolder,
  expandFolder,
} from '../../store/foldersSlice';
import type { Folder } from '../../types';

interface FolderMoveDialogProps {
  folder: Folder | null;
  onClose: () => void;
}

export const FolderMoveDialog = ({ folder, onClose }: FolderMoveDialogProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allFolders = useAppSelector(selectAllFolders);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    folder?.parentId ?? null,
  );

  // Exclude the folder itself and all its descendants
  const isDescendantOf = useCallback((folderId: string, ancestorId: string): boolean => {
    const children = allFolders.filter((f) => f.parentId === folderId);
    for (const child of children) {
      if (child.id === ancestorId) return true;
      if (isDescendantOf(child.id, ancestorId)) return true;
    }
    return false;
  }, [allFolders]);

  const availableFolders = useMemo(() => {
    if (!folder) return [];
    return allFolders
      .filter((f) => f.id !== folder.id && !isDescendantOf(folder.id, f.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allFolders, folder, isDescendantOf]);

  const handleMove = () => {
    if (!folder || selectedParentId === folder.parentId) {
      onClose();
      return;
    }
    // API convention: null = don't change, empty string = set to root
    const apiParentId = selectedParentId ?? '';
    dispatch(updateFolder({ id: folder.id, updates: { parentId: apiParentId } }));
    if (selectedParentId) {
      dispatch(expandFolder(selectedParentId));
    }
    onClose();
  };

  if (!folder) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {t('Folders.MoveTo')} — {folder.name}
      </DialogTitle>
      <DialogContent>
        <List dense>
          <ListItemButton
            selected={selectedParentId === null}
            onClick={() => setSelectedParentId(null)}
          >
            <ListItemIcon>
              <Radio
                checked={selectedParentId === null}
                size="small"
              />
            </ListItemIcon>
            <ListItemIcon>
              <HomeOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('Folders.Root')} />
          </ListItemButton>
          {availableFolders.map((f) => (
            <ListItemButton
              key={f.id}
              selected={selectedParentId === f.id}
              onClick={() => setSelectedParentId(f.id)}
            >
              <ListItemIcon>
                <Radio
                  checked={selectedParentId === f.id}
                  size="small"
                />
              </ListItemIcon>
              <ListItemIcon>
                <FolderOutlinedIcon fontSize="small" sx={{ color: f.color }} />
              </ListItemIcon>
              <ListItemText primary={f.name} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Common.Cancel')}</Button>
        <Button
          onClick={handleMove}
          variant="contained"
          disabled={selectedParentId === folder.parentId}
        >
          {t('Folders.Move')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
