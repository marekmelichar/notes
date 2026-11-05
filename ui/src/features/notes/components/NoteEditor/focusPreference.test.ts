import { describe, it, expect } from 'vitest';
import { FOCUS_MODE_STORAGE_KEY, readFocusMode, writeFocusMode } from './focusPreference';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('focus mode preference', () => {
  it('is off when nothing is stored', () => {
    expect(readFocusMode(memoryStorage())).toBe(false);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    writeFocusMode(true, storage);
    expect(storage.getItem(FOCUS_MODE_STORAGE_KEY)).toBe('1');
    expect(readFocusMode(storage)).toBe(true);

    writeFocusMode(false, storage);
    expect(readFocusMode(storage)).toBe(false);
  });

  it('treats unreadable storage as off and does not throw on write', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readFocusMode(broken)).toBe(false);
    expect(() => writeFocusMode(true, broken)).not.toThrow();
  });
});
