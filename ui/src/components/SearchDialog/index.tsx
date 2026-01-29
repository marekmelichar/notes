import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, Box, InputBase, Typography, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector, openTab } from '@/store';
import { selectAllFolders } from '@/features/notes/store/foldersSlice';
import { setMobileView } from '@/store/uiSlice';
import { notesApi } from '@/features/notes/services/notesApi';
import type { Note } from '@/features/notes/types';
import styles from './index.module.css';

const DEBOUNCE_MS = 300;

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SearchDialog = ({ open, onClose }: SearchDialogProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const folders = useAppSelector(selectAllFolders);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when dialog opens (preserve previous search state)
  useEffect(() => {
    if (open) {
      // Reset selection index but keep query and results
      setSelectedIndex(0);
      // Focus input after dialog animation
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const notes = await notesApi.search(query);
        setResults(notes);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Get folder name by ID
  const getFolderName = useCallback(
    (folderId: string | null): string | null => {
      if (!folderId) return null;
      const folder = folders.find((f) => f.id === folderId);
      return folder?.name || null;
    },
    [folders]
  );

  // Extract text snippet from BlockNote content
  const getContentSnippet = useCallback((content: string, maxLength = 100): string => {
    try {
      const blocks = JSON.parse(content);
      let text = '';
      for (const block of blocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.text) {
              text += item.text + ' ';
            }
          }
        }
        if (text.length >= maxLength) break;
      }
      return text.trim().slice(0, maxLength) || '';
    } catch {
      // If not JSON, return the raw content truncated
      return content.slice(0, maxLength);
    }
  }, []);

  // Handle note selection
  const handleSelect = useCallback(
    (note: Note) => {
      dispatch(openTab(note.id));
      if (isMobile) {
        dispatch(setMobileView('editor'));
      }
      onClose();
    },
    [dispatch, isMobile, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, handleSelect, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedItem = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: styles.dialogPaper,
      }}
      slotProps={{
        backdrop: {
          className: styles.backdrop,
        },
      }}
    >
      <Box className={styles.searchHeader}>
        <SearchIcon className={styles.searchIcon} />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('Common.SearchNotes')}
          className={styles.searchInput}
          fullWidth
          inputProps={{
            'aria-label': t('Common.SearchNotes'),
            'data-testid': 'search-dialog-input',
          }}
        />
        {isLoading && <CircularProgress size={20} className={styles.spinner} />}
      </Box>

      <Box className={styles.resultsContainer} ref={resultsRef}>
        {!query.trim() && (
          <Box className={styles.emptyState}>
            <Typography variant="body2" color="text.secondary">
              {t('Common.TypeToSearch')}
            </Typography>
          </Box>
        )}

        {query.trim() && !isLoading && results.length === 0 && (
          <Box className={styles.emptyState}>
            <Typography variant="body2" color="text.secondary">
              {t('Common.NoResults')}
            </Typography>
          </Box>
        )}

        {results.map((note, index) => {
          const folderName = getFolderName(note.folderId);
          const snippet = getContentSnippet(note.content);

          return (
            <Box
              key={note.id}
              data-index={index}
              className={`${styles.resultItem} ${index === selectedIndex ? styles.selected : ''}`}
              onClick={() => handleSelect(note)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Typography variant="body1" className={styles.resultTitle}>
                {note.title || t('Common.Untitled')}
              </Typography>
              {snippet && (
                <Typography variant="body2" className={styles.resultSnippet}>
                  {snippet}
                </Typography>
              )}
              {folderName && (
                <Box className={styles.folderBadge}>
                  <FolderOutlinedIcon className={styles.folderIcon} />
                  <Typography variant="caption">{folderName}</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box className={styles.footer}>
        <Typography variant="caption" color="text.secondary">
          <span className={styles.shortcutKey}>↑↓</span> {t('Common.Navigate')}{' '}
          <span className={styles.shortcutKey}>↵</span> {t('Common.Open')}{' '}
          <span className={styles.shortcutKey}>esc</span> {t('Common.Close')}
        </Typography>
      </Box>
    </Dialog>
  );
};
