import React, { useState } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectAllTags, createTag } from '../../store/tagsSlice';
import styles from './index.module.css';

interface TagPickerProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export const TagPicker = ({ selectedTagIds, onTagsChange }: TagPickerProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allTags = useAppSelector(selectAllTags);
  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setIsCreating(false);
    setNewTagName('');
    setNewTagColor('#6366f1');
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      const result = await dispatch(
        createTag({ name: newTagName.trim(), color: newTagColor })
      ).unwrap();
      if (result) {
        onTagsChange([...selectedTagIds, result.id]);
      }
      setIsCreating(false);
      setNewTagName('');
      setNewTagColor('#6366f1');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTagName('');
    }
  };

  return (
    <Box className={styles.container}>
      {selectedTags.map((tag) => (
        <Chip
          key={tag.id}
          label={tag.name}
          size="small"
          onDelete={(e) => handleRemoveTag(tag.id, e as React.MouseEvent)}
          sx={{
            backgroundColor: tag.color,
            color: 'white',
            '& .MuiChip-deleteIcon': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: 'white',
              },
            },
          }}
        />
      ))}
      <Tooltip title={t('Tags.ManageTags')}>
        <IconButton
          size="small"
          onClick={handleOpenMenu}
          className={styles.addButton}
        >
          <LocalOfferIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            className: styles.menu,
          },
        }}
      >
        {allTags.length > 0 && (
          <Box>
            {allTags.map((tag) => (
              <MenuItem
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
                className={styles.menuItem}
              >
                <ListItemIcon>
                  <Box
                    className={styles.tagDot}
                    sx={{ backgroundColor: tag.color }}
                  />
                </ListItemIcon>
                <ListItemText>{tag.name}</ListItemText>
                {selectedTagIds.includes(tag.id) && (
                  <CheckIcon fontSize="small" color="primary" />
                )}
              </MenuItem>
            ))}
            <Divider />
          </Box>
        )}

        {isCreating ? (
          <Box className={styles.createForm}>
            <TextField
              autoFocus
              size="small"
              placeholder={t('Tags.TagName')}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.createInput}
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className={styles.colorPicker}
            />
            <IconButton
              size="small"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <MenuItem onClick={() => setIsCreating(true)}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('Tags.CreateNew')}</ListItemText>
          </MenuItem>
        )}

        {allTags.length === 0 && !isCreating && (
          <Box className={styles.emptyState}>
            <Typography variant="caption" color="text.secondary">
              {t('Tags.NoTagsYet')}
            </Typography>
          </Box>
        )}
      </Menu>
    </Box>
  );
};
