import { describe, it, expect } from 'vitest';
import { formatShortcut, shortcutLabel } from './shortcuts';

describe('formatShortcut', () => {
  it('uses Ctrl/Alt/Shift joined with + off Apple platforms', () => {
    expect(formatShortcut('Mod-B', false)).toBe('Ctrl+B');
    expect(formatShortcut('Mod-Alt-1', false)).toBe('Ctrl+Alt+1');
    expect(formatShortcut('Mod-Shift-Enter', false)).toBe('Ctrl+Shift+Enter');
  });

  it('uses symbols without separators on Apple platforms', () => {
    expect(formatShortcut('Mod-B', true)).toBe('⌘B');
    expect(formatShortcut('Mod-Alt-c', true)).toBe('⌘⌥C');
    expect(formatShortcut('Shift-Tab', true)).toBe('⇧Tab');
  });
});

describe('shortcutLabel', () => {
  it('appends key and markdown hints', () => {
    expect(shortcutLabel('Heading 1', 'Mod-Alt-1', '#', false)).toBe('Heading 1 (Ctrl+Alt+1 · #)');
  });

  it('handles a markdown-only or key-less item', () => {
    expect(shortcutLabel('Divider', undefined, '---', false)).toBe('Divider (---)');
    expect(shortcutLabel('Insert file', undefined, undefined, false)).toBe('Insert file');
  });
});
