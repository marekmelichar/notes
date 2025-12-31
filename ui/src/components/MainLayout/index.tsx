import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import styles from './index.module.css';
import { HEADER_HEIGHT } from '@/config';
import { Header } from '../Header';

const MainLayout = () => {
  return (
    <>
      <Header />
      <Box
        component="main"
        className={styles.mainContent}
        sx={{
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      >
        <Outlet />
      </Box>
    </>
  );
};

export default MainLayout;
