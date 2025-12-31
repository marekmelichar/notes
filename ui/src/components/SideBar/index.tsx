import React from 'react';
import { Box, List, ListItemButton, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import { ROUTE_HOME } from '@/config';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

export const SideBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pages = [
    {
      title: t('Common.Nav.Home'),
      href: ROUTE_HOME,
      component: (
        <Box className={styles.iconWrapper}>
          <HomeIcon />
        </Box>
      ),
      locationArr: ['/'],
    },
    {
      title: t('Common.Nav.Settings'),
      href: '/settings',
      component: (
        <Box className={styles.iconWrapper}>
          <SettingsIcon />
        </Box>
      ),
      locationArr: ['/settings'],
    },
  ];

  return (
    <Box component="aside" className={styles.sidebar} data-testid="sidebar">
      <List data-testid="sidebar-nav-list">
        {pages.map((page) => (
          <ListItemButton
            key={page.href}
            data-testid={`sidebar-nav-${page.href.replace(/\//g, '') || 'home'}`}
            selected={page.locationArr.includes(location.pathname)}
            onClick={() => navigate(page.href)}
            className={styles.navButton}
          >
            {page.component}
            <Typography variant="caption" className={styles.navLabel}>
              {page.title}
            </Typography>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
