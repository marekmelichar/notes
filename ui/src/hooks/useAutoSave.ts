import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions {
  /** Delay in milliseconds before auto-save triggers (default: 10000) */
  delayMs?: number;
  /** Callback that performs the actual save */
  onSave: () => void;
}

interface UseAutoSaveReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Countdown in seconds until auto-save fires, or null if idle */
  autoSaveCountdown: number | null;
  /** Call when content changes to mark as dirty and schedule auto-save */
  markDirty: () => void;
  /** Call after a successful save to reset state */
  markClean: () => void;
  /** Trigger an immediate save, cancelling any pending auto-save */
  saveNow: () => void;
}

export function useAutoSave({
  delayMs = 10_000,
  onSave,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const delaySeconds = Math.ceil(delayMs / 1000);

  const clearTimers = useCallback(() => {
    clearTimeout(autoSaveTimerRef.current);
    clearInterval(countdownIntervalRef.current);
    setAutoSaveCountdown(null);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    clearTimeout(autoSaveTimerRef.current);
    clearInterval(countdownIntervalRef.current);

    setAutoSaveCountdown(delaySeconds);
    countdownIntervalRef.current = setInterval(() => {
      setAutoSaveCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1_000);

    autoSaveTimerRef.current = setTimeout(() => {
      clearInterval(countdownIntervalRef.current);
      setAutoSaveCountdown(null);
      onSaveRef.current();
    }, delayMs);
  }, [delayMs, delaySeconds]);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const markClean = useCallback(() => {
    setHasUnsavedChanges(false);
    clearTimers();
  }, [clearTimers]);

  const saveNow = useCallback(() => {
    clearTimers();
    onSaveRef.current();
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoSaveTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return {
    hasUnsavedChanges,
    autoSaveCountdown,
    markDirty,
    markClean,
    saveNow,
  };
}
