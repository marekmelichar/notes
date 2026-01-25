import { Box, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

interface SearchInputProps {
  onClick: () => void;
}

export const SearchInput = ({ onClick }: SearchInputProps) => {
  const { t } = useTranslation();

  return (
    <Box
      className={styles.searchContainer}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid="search-trigger"
    >
      <SearchIcon className={styles.searchIcon} />
      <Typography className={styles.placeholder}>{t('Common.Search')}</Typography>
      <Box className={styles.shortcutHint}>
        <Typography variant="caption" className={styles.shortcutText}>
          ⌘K
        </Typography>
      </Box>
    </Box>
  );
};
