/**
 * Keyboard shortcut labels for toolbar tooltips.
 *
 * Keys use TipTap/ProseMirror notation (`Mod-Shift-8`) so they mirror the
 * bindings registered by StarterKit; `formatShortcut` renders them for the
 * current platform (⌘ on Apple, Ctrl elsewhere).
 */

export const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

const APPLE_KEYS: Record<string, string> = { Mod: '⌘', Alt: '⌥', Shift: '⇧' };
const OTHER_KEYS: Record<string, string> = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift' };

export function formatShortcut(keys: string, apple = isApplePlatform()): string {
  const map = apple ? APPLE_KEYS : OTHER_KEYS;
  const parts = keys.split('-').map((part) => map[part] ?? (part.length === 1 ? part.toUpperCase() : part));
  return parts.join(apple ? '' : '+');
}

/**
 * Builds a tooltip label like "Bold (Ctrl+B)" or "Heading 1 (⌘⌥1 · # )".
 * `markdown` is the input-rule trigger the user can type instead.
 */
export function shortcutLabel(label: string, keys?: string, markdown?: string, apple = isApplePlatform()): string {
  const hints = [keys && formatShortcut(keys, apple), markdown].filter(Boolean);
  return hints.length ? `${label} (${hints.join(' · ')})` : label;
}

/** StarterKit / extension bindings shown in the toolbar. */
export const SHORTCUTS = {
  heading1: { keys: 'Mod-Alt-1', markdown: '#' },
  heading2: { keys: 'Mod-Alt-2', markdown: '##' },
  heading3: { keys: 'Mod-Alt-3', markdown: '###' },
  bold: { keys: 'Mod-B', markdown: '**text**' },
  italic: { keys: 'Mod-I', markdown: '*text*' },
  underline: { keys: 'Mod-U' },
  strike: { keys: 'Mod-Shift-S', markdown: '~~text~~' },
  code: { keys: 'Mod-E', markdown: '`code`' },
  bulletList: { keys: 'Mod-Shift-8', markdown: '-' },
  orderedList: { keys: 'Mod-Shift-7', markdown: '1.' },
  taskList: { keys: 'Mod-Shift-9', markdown: '[ ]' },
  indent: { keys: 'Tab' },
  outdent: { keys: 'Shift-Tab' },
  blockquote: { keys: 'Mod-Shift-B', markdown: '>' },
  codeBlock: { keys: 'Mod-Alt-C', markdown: '```' },
  horizontalRule: { markdown: '---' },
  link: { keys: 'Mod-K', markdown: '[text](url)' },
  focusMode: { keys: 'Mod-Shift-Enter' },
} as const satisfies Record<string, { keys?: string; markdown?: string }>;
