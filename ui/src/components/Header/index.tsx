import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Divider,
  Switch,
  CircularProgress,
} from '@mui/material';
import styles from './index.module.css';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { ROUTE_HOME } from '@/config';
import { LanguageSwitch } from '../LanguageSwitch';
import { SearchInput } from '../SearchInput';
import { SearchDialog } from '../SearchDialog';
import { useColorMode } from '@/theme/ThemeProvider';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { toggleNoteListHidden } from '@/store/uiSlice';
import { createNote, selectNotesFilter, selectNotesCreating } from '@/features/notes/store/notesSlice';
import { useAppVersion } from '@/hooks';
import { Logo } from '../Logo';

export const Header = () => {
  const { t } = useTranslation();
  const { mode, toggleColorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const noteListHidden = useAppSelector((state) => state.ui.noteListHidden);
  const isMobile = useAppSelector((state) => state.ui.isMobile);
  const filter = useAppSelector(selectNotesFilter);
  const isCreating = useAppSelector(selectNotesCreating);
  const { version } = useAppVersion();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const open = Boolean(anchorEl);

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenSearch]);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
  };

  const handleThemeToggle = () => {
    toggleColorMode();
  };

  const handleCreateNote = () => {
    if (isCreating) return;
    dispatch(createNote({ folderId: filter.folderId }));
    navigate('/');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  return (
    <Box data-testid="header" className={styles.header}>
      <Link to={ROUTE_HOME} data-testid="header-logo-link" className={styles.logoLink}>
        <Logo className={styles.logoIcon} />
      </Link>

      <SearchInput onClick={handleOpenSearch} />
      <SearchDialog open={isSearchOpen} onClose={handleCloseSearch} />

      <Stack direction={'row'} gap={1} alignItems="center">
        <Button variant="contained" size="small" startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />} onClick={handleCreateNote} disabled={isCreating} data-testid="header-new-note-button" className={styles.newNoteButton}>
          {t('Notes.NewNote')}
        </Button>
        <LanguageSwitch />
        <IconButton
          onClick={handleAvatarClick}
          data-testid="user-avatar-button"
          className={styles.avatarButton}
        >
          <Avatar className={styles.avatar}>
            <AccountCircleOutlinedIcon />
          </Avatar>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          data-testid="user-menu"
          PaperProps={{
            className: styles.menuPaper,
          }}
        >
          <Box className={styles.menuUserInfo}>
            <Avatar className={styles.avatar}>
              <AccountCircleOutlinedIcon />
            </Avatar>
            <Typography variant="body1">{user?.username || 'User'}</Typography>
          </Box>
          <Box className={styles.menuSection}>
            <Box className={styles.themeToggleRow} data-testid="dark-mode-toggle-container">
              <Box className={styles.themeToggleLeft}>
                <Box className={styles.iconWrapper}>
                  <DarkModeOutlinedIcon className={styles.icon} />
                </Box>
                <Typography variant="body1">{t('Common.DarkMode')}</Typography>
              </Box>
              <Box>
                <Switch
                  checked={mode === 'dark'}
                  onChange={handleThemeToggle}
                  size="small"
                />
              </Box>
            </Box>
            {!isMobile && (
              <Box className={styles.themeToggleRow}>
                <Box className={styles.themeToggleLeft}>
                  <Box className={styles.iconWrapper}>
                    <ViewListOutlinedIcon className={styles.icon} />
                  </Box>
                  <Typography variant="body1">{t('SettingsPage.ShowNoteList')}</Typography>
                </Box>
                <Box>
                  <Switch
                    checked={!noteListHidden}
                    onChange={() => dispatch(toggleNoteListHidden())}
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </Box>
          <Divider />
          <MenuItem onClick={handleSettings} className={styles.logoutMenuItem}>
            <Box className={styles.logoutRow}>
              <Box className={styles.iconWrapper}>
                <SettingsOutlinedIcon fontSize="small" className={styles.icon} />
              </Box>
              <Typography variant="body1">{t('Common.Nav.Settings')}</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            data-testid="logout-menu-item"
            className={styles.logoutMenuItem}
          >
            <Box className={styles.logoutRow}>
              <Box className={styles.iconWrapper}>
                <LogoutIcon fontSize="small" className={styles.icon} />
              </Box>
              <Typography variant="body1">{t('Common.Logout')}</Typography>
            </Box>
          </MenuItem>
          <Box className={styles.footerSection}>
            <Typography variant="body2" className={styles.versionText}>
              {t('Common.Version')} {version}
            </Typography>
          </Box>
        </Menu>
      </Stack>
    </Box>
  );
};
