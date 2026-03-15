import { useState, useCallback, useEffect, useRef } from 'react';

interface ResizablePanelConfig {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Pixel offset from the left edge of the container where this panel starts */
  offsetLeft?: number;
}

interface ResizablePanelResult {
  width: number;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Hook for managing a resizable panel with mouse drag and localStorage persistence.
 *
 * @param containerRef - Ref to the container element used for coordinate calculation
 * @param config - Panel configuration (storage key, default/min/max widths, offset)
 */
export function useResizablePanel(
  containerRef: React.RefObject<HTMLDivElement | null>,
  config: ResizablePanelConfig,
): ResizablePanelResult {
  const { storageKey, defaultWidth, minWidth, maxWidth, offsetLeft = 0 } = config;

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Use refs for values needed in mousemove/mouseup handlers to avoid stale closures
  const widthRef = useRef(width);
  widthRef.current = width;

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left - offsetLeft;
      const clamped = Math.min(Math.max(x, minWidth), maxWidth);
      setWidth(clamped);
    };

    const handleMouseUp = () => {
      localStorage.setItem(storageKey, widthRef.current.toString());
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, containerRef, offsetLeft, minWidth, maxWidth, storageKey]);

  return { width, isResizing, onResizeStart };
}
