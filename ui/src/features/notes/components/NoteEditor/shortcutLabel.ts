import { isMacOS } from '@tiptap/core';

/**
 * Human-readable form of a TipTap chord, e.g. ['Mod', 'Alt', '1'] → "Ctrl+Alt+1" or "⌘+Alt+1".
 * Single-letter keys are shown uppercase so tooltips match the existing "Ctrl+B" style.
 */
export function formatShortcut(parts: readonly string[]): string {
  const mod = isMacOS() ? '⌘' : 'Ctrl';
  return parts
    .map((part) => {
      if (part === 'Mod') return mod;
      if (part.length === 1) return part.toUpperCase();
      return part;
    })
    .join('+');
}
