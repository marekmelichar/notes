import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import AddIcon from '@mui/icons-material/Add';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import SortIcon from '@mui/icons-material/Sort';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useAppDispatch, useAppSelector, toggleNoteListCollapsed } from '@/store';
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
import { selectAllFolders } from '../../store/foldersSlice';
import { selectNotesFilter } from '../../store/notesSlice';
import type { NotesSortBy, Note } from '../../types';

const EMPTY_TAGS: never[] = [];
import { NoteCard } from './NoteCard';
import { NoteListItem } from './NoteListItem';
import styles from './index.module.css';

// Grid components for VirtuosoGrid
const GridList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} className={styles.gridView} />,
);
GridList.displayName = 'GridList';

const GridItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div {...props} className={styles.gridItem} />
);

interface NoteListProps {
  collapsed?: boolean;
}

export const NoteList = ({ collapsed = false }: NoteListProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectFilteredNotes);
  const allTags = useAppSelector(selectAllTags);
  const allFolders = useAppSelector(selectAllFolders);
  const viewMode = useAppSelector(selectNotesViewMode);
  const sortBy = useAppSelector(selectNotesSortBy);
  const sortOrder = useAppSelector(selectNotesSortOrder);
  const filter = useAppSelector(selectNotesFilter);
  const selectedNoteId = useAppSelector((state) => state.notes.selectedNoteId);
  const isLoading = useAppSelector(selectNotesLoading);
  const isMobile = useAppSelector((state) => state.ui.isMobile);

  const [sortAnchorEl, setSortAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleCreateNote = () => {
    dispatch(createNote({ folderId: filter.folderId }));
  };

  const handleSelectNote = React.useCallback((noteId: string) => {
    dispatch(setSelectedNote(noteId));
  }, [dispatch]);

  const tagsByNoteId = React.useMemo(() => {
    const map = new Map<string, typeof allTags>();
    for (const note of notes) {
      map.set(note.id, allTags.filter(tag => note.tags.includes(tag.id)));
    }
    return map;
  }, [notes, allTags]);

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

  const getSortLabel = () => {
    const labels: Record<NotesSortBy, string> = {
      updatedAt: t("Sort.Modified"),
      createdAt: t("Sort.Created"),
      title: t("Sort.Title"),
    };
    return `${labels[sortBy]} ${sortOrder === 'asc' ? '↑' : '↓'}`;
  };

  const getTitle = () => {
    if (filter.isDeleted) return t("Notes.Trash");
    if (filter.isPinned) return t("Notes.Favorites");
    if (filter.searchQuery) return `${t("Common.Search")} "${filter.searchQuery}"`;
    if (filter.folderId) {
      const folder = allFolders.find((f) => f.id === filter.folderId);
      return folder?.name || t("Notes.AllNotes");
    }
    return t("Notes.AllNotes");
  };

  const handleToggleCollapse = () => {
    dispatch(toggleNoteListCollapsed());
  };

  // Collapsed view - compact note list
  if (collapsed) {
    return (
      <Box className={`${styles.container} ${styles.containerCollapsed}`}>
        <Box className={styles.collapsedHeader}>
          {!isMobile && (
            <Tooltip title={t("Common.ExpandNoteList")} placement="right">
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t("Notes.NewNote")} placement="right">
            <IconButton size="small" onClick={handleCreateNote}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box className={styles.collapsedList}>
          {notes.map((note) => (
            <Tooltip key={note.id} title={note.title || t("Common.Untitled")} placement="right">
              <IconButton
                size="small"
                onClick={() => handleSelectNote(note.id)}
                className={note.id === selectedNoteId ? styles.collapsedNoteActive : ''}
              >
                <DescriptionOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>
    );
  }

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
            {t("Notes.NewNote")}
          </Button>
          <Tooltip title={t("Sort.Sort")}>
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
              {t("Sort.Modified")} {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem
              onClick={() => handleSortChange('createdAt')}
              selected={sortBy === 'createdAt'}
            >
              {t("Sort.Created")} {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
            <MenuItem
              onClick={() => handleSortChange('title')}
              selected={sortBy === 'title'}
            >
              {t("Sort.Title")} {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </MenuItem>
          </Menu>
          <Tooltip title={viewMode === 'grid' ? t("View.ListView") : t("View.GridView")}>
            <IconButton size="small" onClick={handleToggleViewMode}>
              {viewMode === 'grid' ? (
                <ViewListIcon fontSize="small" />
              ) : (
                <ViewModuleIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {!isMobile && (
            <Tooltip title={t("Common.CollapseNoteList")}>
              <IconButton size="small" onClick={handleToggleCollapse}>
                <MenuOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box className={styles.listContainer}>
        {isLoading ? (
          <Box className={styles.loadingState}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              {t("Notes.LoadingNotes")}
            </Typography>
          </Box>
        ) : notes.length === 0 ? (
          <Box className={styles.emptyState}>
            <NoteOutlinedIcon className={styles.emptyStateIcon} />
            <Typography variant="h6">{t("Notes.NoNotesYet")}</Typography>
            <Typography variant="body2">
              {t("Notes.NoNotesHint")}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateNote}
            >
              {t("Notes.CreateNote")}
            </Button>
          </Box>
        ) : viewMode === 'grid' ? (
          <VirtuosoGrid
            data={notes}
            components={{ List: GridList, Item: GridItem }}
            itemContent={(index: number, note: Note) => (
              <NoteCard
                note={note}
                tags={tagsByNoteId.get(note.id) || EMPTY_TAGS}
                isSelected={note.id === selectedNoteId}
                onSelect={handleSelectNote}
              />
            )}
          />
        ) : (
          <Virtuoso
            data={notes}
            className={styles.listView}
            itemContent={(index: number, note: Note) => (
              <NoteListItem
                note={note}
                tags={tagsByNoteId.get(note.id) || EMPTY_TAGS}
                isSelected={note.id === selectedNoteId}
                onSelect={handleSelectNote}
              />
            )}
          />
        )}
      </Box>
    </Box>
  );
};
