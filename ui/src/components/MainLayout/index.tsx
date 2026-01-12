import React, { useEffect } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import styles from './index.module.css';
import { HEADER_HEIGHT, MOBILE_NAV_HEIGHT, MOBILE_BREAKPOINT } from '@/config';
import { Header } from '../Header';
import { MobileNavigation } from '../MobileNavigation';
import { useAppDispatch, setIsMobile } from '@/store';

const MainLayout = () => {
  const dispatch = useAppDispatch();
  const isMobileWidth = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);
  const isLandscapeMobile = useMediaQuery('(max-height: 500px) and (orientation: landscape)');
  const isMobile = isMobileWidth || isLandscapeMobile;

  useEffect(() => {
    dispatch(setIsMobile(isMobile));
  }, [dispatch, isMobile]);

  return (
    <>
      <Header />
      <Box
        component="main"
        className={styles.mainContent}
        sx={{
          height: isMobile
            ? `calc(100vh - ${HEADER_HEIGHT}px - ${MOBILE_NAV_HEIGHT}px)`
            : `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      >
        <Outlet />
      </Box>
      <MobileNavigation />
    </>
  );
};

export default MainLayout;
