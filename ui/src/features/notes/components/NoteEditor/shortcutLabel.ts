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

/** Joins the hints that are present, e.g. ["Ctrl+B", "**text**"] → "Ctrl+B · **text**". */
export function joinHints(...hints: (string | undefined)[]): string {
  return hints.filter((hint): hint is string => Boolean(hint)).join(' · ');
}

/**
 * Tooltip text with optional hints, e.g. "Bold (Ctrl+B · **text**)".
 * A markdown hint is what the user can type instead (an input rule), shown as-is.
 */
export function withHints(label: string, ...hints: (string | undefined)[]): string {
  const joined = joinHints(...hints);
  return joined ? `${label} (${joined})` : label;
}

export const FOCUS_MODE_SHORTCUT = ['Mod', 'Shift', 'Enter'] as const;
