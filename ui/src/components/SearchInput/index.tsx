import { useState, useEffect, useRef, useCallback } from 'react';
import { InputBase, IconButton, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { setFilter, selectNotesFilter } from '@/features/notes/store/notesSlice';
import styles from './index.module.css';

const DEBOUNCE_MS = 300;

export const SearchInput = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectNotesFilter);
  const [localValue, setLocalValue] = useState(filter.searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when filter.searchQuery changes externally
  useEffect(() => {
    setLocalValue(filter.searchQuery);
  }, [filter.searchQuery]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dispatchSearch = useCallback(
    (query: string) => {
      dispatch(setFilter({ searchQuery: query }));
    },
    [dispatch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);

    // Debounce the dispatch
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      dispatchSearch(value);
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setLocalValue('');
    dispatchSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  return (
    <Box className={styles.searchContainer}>
      <SearchIcon className={styles.searchIcon} />
      <InputBase
        inputRef={inputRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('Common.Search')}
        className={styles.input}
        inputProps={{
          'aria-label': t('Common.Search'),
          'data-testid': 'search-input',
        }}
      />
      {localValue && (
        <IconButton
          size="small"
          onClick={handleClear}
          className={styles.clearButton}
          aria-label={t('Common.ClearSearch')}
          data-testid="search-clear-button"
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};
