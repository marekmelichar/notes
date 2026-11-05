import { describe, it, expect, afterEach } from 'vitest';
import { formatShortcut } from './shortcutLabel';

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
    expect(formatShortcut(['Mod', '\\'])).toBe('Ctrl+\\');
  });

  it('uses the command glyph on Mac', () => {
    setPlatform('MacIntel');
    expect(formatShortcut(['Mod', 'Shift', '8'])).toBe('⌘+Shift+8');
    expect(formatShortcut(['Mod', 'K'])).toBe('⌘+K');
  });
});
