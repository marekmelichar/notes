import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import SortIcon from '@mui/icons-material/Sort';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectFilteredNotes,
  selectNotesViewMode,
  selectNotesSortBy,
  selectNotesSortOrder,
  selectNotesLoading,
  setSelectedNote,
  setViewMode,
  setSortBy,
  setSortOrder,
  createNote,
} from '../../store/notesSlice';
import { selectAllTags } from '../../store/tagsSlice';
import { selectNotesFilter } from '../../store/notesSlice';
import type { NotesSortBy, NotesSortOrder } from '../../types';
import { NoteCard } from './NoteCard';
import { NoteListItem } from './NoteListItem';
import styles from './index.module.css';

export const NoteList = () => {
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectFilteredNotes);
  const allTags = useAppSelector(selectAllTags);
  const viewMode = useAppSelector(selectNotesViewMode);
  const sortBy = useAppSelector(selectNotesSortBy);
  const sortOrder = useAppSelector(selectNotesSortOrder);
  const filter = useAppSelector(selectNotesFilter);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isLoading = useAppSelector(selectNotesLoading);

  const [sortAnchorEl, setSortAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleCreateNote = () => {
    dispatch(createNote({ folderId: filter.folderId }));
  };

  const handleSelectNote = (noteId: string) => {
    dispatch(setSelectedNote(noteId));
  };

  const handleToggleViewMode = () => {
    dispatch(setViewMode(viewMode === 'grid' ? 'list' : 'grid'));
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortChange = (newSortBy: NotesSortBy) => {
    if (sortBy === newSortBy) {
      dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      dispatch(setSortBy(newSortBy));
      dispatch(setSortOrder('desc'));
    }
    handleSortClose();
  };

  const getTagsForNote = (tagIds: string[]) => {
    return allTags.filter((tag) => tagIds.includes(tag.id));
  };

  const getSortLabel = () => {
    const labels: Record<NotesSortBy, string> = {
      updatedAt: 'Modified',
      createdAt: 'Created',
      title: 'Title',
    };
    return `${labels[sortBy]} ${sortOrder === 'asc' ? '↑' : '↓'}`;
  };

  const getTitle = () => {
    if (filter.isDeleted) return 'Trash';
    if (filter.isPinned) return 'Favorites';
    if (filter.searchQuery) return `Search: "${filter.searchQuery}"`;
    return 'All Notes';
  };

  return (
    <Box className={styles.container}>
      <Box className={styles.header}>
        <Typography variant="h6" className={styles.headerTitle}>
          {getTitle()} ({notes.length})
        </Typography>
        <Box className={styles.headerActions}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreateNote}
          >
            New Note
          </Button>
          <Tooltip title="Sort">
            <IconButton size="small" onClick={handleSortClick}>
              <SortIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={handleSortClose}
          >
            <MenuItem
              onClick={() => handleSortChange('updatedAt')}
              selected={sortBy === 'updatedAt'}
            >
              Modified {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem
              onClick={() => handleSortChange('createdAt')}
              selected={sortBy === 'createdAt'}
            >
              Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem
              onClick={() => handleSortChange('title')}
              selected={sortBy === 'title'}
            >
              Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
          </Menu>
          <Tooltip title={viewMode === 'grid' ? 'List view' : 'Grid view'}>
            <IconButton size="small" onClick={handleToggleViewMode}>
              {viewMode === 'grid' ? (
                <ViewListIcon fontSize="small" />
              ) : (
                <ViewModuleIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box className={styles.listContainer}>
        {isLoading ? (
          <Box className={styles.loadingState}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Loading notes...
            </Typography>
          </Box>
        ) : notes.length === 0 ? (
          <Box className={styles.emptyState}>
            <NoteOutlinedIcon className={styles.emptyStateIcon} />
            <Typography variant="h6">No notes yet</Typography>
            <Typography variant="body2">
              Click &quot;New Note&quot; to create your first note
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateNote}
            >
              Create Note
            </Button>
          </Box>
        ) : (
          <Box className={viewMode === 'grid' ? styles.gridView : styles.listView}>
            {notes.map((note) =>
              viewMode === 'grid' ? (
                <NoteCard
                  key={note.id}
                  note={note}
                  tags={getTagsForNote(note.tags)}
                  isSelected={note.id === selectedNoteId}
                  onClick={() => handleSelectNote(note.id)}
                />
              ) : (
                <NoteListItem
                  key={note.id}
                  note={note}
                  tags={getTagsForNote(note.tags)}
                  isSelected={note.id === selectedNoteId}
                  onClick={() => handleSelectNote(note.id)}
                />
              ),
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
