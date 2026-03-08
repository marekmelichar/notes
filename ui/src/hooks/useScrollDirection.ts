import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector, selectIsMobile, selectMobileView } from '@/store';
import { setScrollHidden } from '@/store/uiSlice';

const SCROLL_THRESHOLD = 10;

export function useScrollDirection(scrollRef: React.RefObject<HTMLElement | null>) {
  const dispatch = useAppDispatch();
  const isMobile = useAppSelector(selectIsMobile);
  const mobileView = useAppSelector(selectMobileView);
  const lastScrollTop = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const currentScrollTop = el.scrollTop;
    const diff = currentScrollTop - lastScrollTop.current;

    if (Math.abs(diff) < SCROLL_THRESHOLD) return;

    if (diff > 0 && currentScrollTop > 50) {
      dispatch(setScrollHidden(true));
    } else if (diff < 0) {
      dispatch(setScrollHidden(false));
    }

    lastScrollTop.current = currentScrollTop;
  }, [dispatch, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!isMobile || mobileView !== 'editor' || !el) {
      dispatch(setScrollHidden(false));
      return;
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, mobileView, scrollRef, handleScroll, dispatch]);

  // Reset when leaving editor view
  useEffect(() => {
    if (mobileView !== 'editor') {
      dispatch(setScrollHidden(false));
    }
  }, [mobileView, dispatch]);
}
