export const FOCUS_MODE_STORAGE_KEY = 'notes.editor.focusMode';

function storageOrNull(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Distraction-free preference. Missing or unreadable storage means off. */
export function readFocusMode(storage: Pick<Storage, 'getItem'> | null = storageOrNull()): boolean {
  try {
    return storage?.getItem(FOCUS_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeFocusMode(
  enabled: boolean,
  storage: Pick<Storage, 'setItem'> | null = storageOrNull(),
): void {
  try {
    storage?.setItem(FOCUS_MODE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Private mode or blocked storage — the toggle still works for this session.
  }
}
