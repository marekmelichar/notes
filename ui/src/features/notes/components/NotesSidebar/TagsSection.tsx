import { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectAllTags, selectTagsLoading, createTag, updateTag, deleteTag } from '../../store/tagsSlice';
import { setFilter, selectNotesFilter } from '../../store/notesSlice';
import { TagFormDialog } from './TagFormDialog';
import styles from './index.module.css';

export const TagsSection = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const tags = useAppSelector(selectAllTags);
  const filter = useAppSelector(selectNotesFilter);
  const isTagsLoading = useAppSelector(selectTagsLoading);

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isEditTagDialogOpen, setIsEditTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const editingTag = editingTagId ? tags.find((t) => t.id === editingTagId) : undefined;

  const handleTagClick = (tagId: string) => {
    const currentTags = filter.tagIds;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    dispatch(setFilter({ tagIds: newTags }));
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
    if (filter.tagIds.includes(tagId)) {
      dispatch(setFilter({ tagIds: filter.tagIds.filter((id) => id !== tagId) }));
    }
  };

  return (
    <Box className={styles.section}>
      <Box className={styles.sectionHeader}>
        <Typography className={styles.sectionTitle}>{t('Tags.Tags')}</Typography>
        <Tooltip title={t('Tags.NewTag')}>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTagClick(tag.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTagClick(tag.id)}
                  sx={{
                    backgroundColor: filter.tagIds.includes(tag.id) ? tag.color : 'transparent',
                    color: filter.tagIds.includes(tag.id) ? 'white' : 'inherit',
                    border: `1px solid ${tag.color}`,
                  }}
                >
                  <span className={styles.tagDot} style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </Box>
                <Box className={styles.tagActions}>
                  <Tooltip title={t('Tags.EditTag')}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenEditTag(tag.id, e)}
                      className={styles.tagActionButton}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('Tags.DeleteTag')}>
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
              <Box className={styles.addButton} onClick={() => setIsTagDialogOpen(true)}>
                <LocalOfferOutlinedIcon fontSize="small" />
                <span>{t('Tags.AddTag')}</span>
              </Box>
            )}
          </>
        )}
      </Box>

      <TagFormDialog
        open={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onSubmit={handleCreateTag}
        mode="create"
      />

      <TagFormDialog
        open={isEditTagDialogOpen}
        onClose={handleCloseEditTagDialog}
        onSubmit={handleUpdateTag}
        initialName={editingTag?.name}
        initialColor={editingTag?.color}
        mode="edit"
      />
    </Box>
  );
};
