import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with no unsaved changes', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave }));

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.hasUnsavedChangesRef.current).toBe(false);
    expect(result.current.autoSaveCountdown).toBeNull();
  });

  it('should mark as dirty when markDirty is called', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave }));

    act(() => {
      result.current.markDirty();
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.hasUnsavedChangesRef.current).toBe(true);
  });

  it('should show countdown after markDirty', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 5000 }));

    act(() => {
      result.current.markDirty();
    });

    expect(result.current.autoSaveCountdown).toBe(5);
  });

  it('should decrement countdown each second', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 5000 }));

    act(() => {
      result.current.markDirty();
    });
    expect(result.current.autoSaveCountdown).toBe(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.autoSaveCountdown).toBe(4);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.autoSaveCountdown).toBe(3);
  });

  it('should call onSave after delay expires', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 3000 }));

    act(() => {
      result.current.markDirty();
    });

    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.autoSaveCountdown).toBeNull();
  });

  it('should reset countdown when markDirty is called again', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 5000 }));

    act(() => {
      result.current.markDirty();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.autoSaveCountdown).toBe(2);

    // Mark dirty again — should reset to 5
    act(() => {
      result.current.markDirty();
    });
    expect(result.current.autoSaveCountdown).toBe(5);

    // Original timer should NOT fire at t=5s
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onSave).not.toHaveBeenCalled();

    // Should fire at t=5s from second markDirty
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should clear state when markClean is called', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 5000 }));

    act(() => {
      result.current.markDirty();
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => {
      result.current.markClean();
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.hasUnsavedChangesRef.current).toBe(false);
    expect(result.current.autoSaveCountdown).toBeNull();

    // Timer should not fire after markClean
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should save immediately when saveNow is called', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 10000 }));

    act(() => {
      result.current.markDirty();
    });

    act(() => {
      result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.autoSaveCountdown).toBeNull();

    // Pending timer should not fire again
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should flush when dirty', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave, delayMs: 10000 }));

    act(() => {
      result.current.markDirty();
    });

    act(() => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should not flush when clean', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave }));

    act(() => {
      result.current.flush();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should use latest onSave callback', () => {
    const onSave1 = vi.fn();
    const onSave2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ onSave }) => useAutoSave({ onSave, delayMs: 3000 }),
      { initialProps: { onSave: onSave1 } },
    );

    act(() => {
      result.current.markDirty();
    });

    // Switch callback before timer fires
    rerender({ onSave: onSave2 });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onSave1).not.toHaveBeenCalled();
    expect(onSave2).toHaveBeenCalledTimes(1);
  });

  it('should default delay to 10 seconds', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAutoSave({ onSave }));

    act(() => {
      result.current.markDirty();
    });

    expect(result.current.autoSaveCountdown).toBe(10);

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should clean up timers on unmount', () => {
    const onSave = vi.fn();
    const { result, unmount } = renderHook(() => useAutoSave({ onSave, delayMs: 5000 }));

    act(() => {
      result.current.markDirty();
    });

    unmount();

    // Timer should not fire after unmount
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
