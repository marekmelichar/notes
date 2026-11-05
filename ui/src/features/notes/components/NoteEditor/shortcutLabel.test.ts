import { describe, it, expect, afterEach } from 'vitest';
import { formatShortcut, joinHints, withHints } from './shortcutLabel';

const originalPlatform = navigator.platform;

function setPlatform(platform: string) {
  Object.defineProperty(navigator, 'platform', {
    value: platform,
    configurable: true,
  });
}

describe('formatShortcut', () => {
  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('uses Ctrl on non-Mac platforms', () => {
    setPlatform('Linux x86_64');
    expect(formatShortcut(['Mod', 'B'])).toBe('Ctrl+B');
    expect(formatShortcut(['Mod', 'Alt', '1'])).toBe('Ctrl+Alt+1');
    expect(formatShortcut(['Mod', 'Shift', 'Enter'])).toBe('Ctrl+Shift+Enter');
  });

  it('uses the command glyph on Mac', () => {
    setPlatform('MacIntel');
    expect(formatShortcut(['Mod', 'Shift', '8'])).toBe('⌘+Shift+8');
    expect(formatShortcut(['Mod', 'K'])).toBe('⌘+K');
  });
});

describe('withHints', () => {
  it('appends the key chord and markdown trigger that are present', () => {
    expect(withHints('Bold', 'Ctrl+B', '**text**')).toBe('Bold (Ctrl+B · **text**)');
    expect(withHints('Rule', undefined, '---')).toBe('Rule (---)');
    expect(joinHints('Ctrl+Alt+1', '#')).toBe('Ctrl+Alt+1 · #');
  });

  it('returns the bare label without hints', () => {
    expect(withHints('Insert file')).toBe('Insert file');
    expect(joinHints(undefined, '')).toBe('');
  });
});
