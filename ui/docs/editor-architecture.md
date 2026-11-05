# Editor Architecture

The note editor uses [TipTap](https://tiptap.dev/) (ProseMirror-based) for rich text editing. It replaced BlockNote in March 2026.

## File Structure

```
NoteEditor/
├── SingleNoteEditor.tsx    # Orchestrator — save logic, auto-save, state, keyboard shortcuts, focus mode
├── EditorHeader.tsx        # Title input, focus-mode toggle, folder/tag pickers, pin, delete, export
├── TiptapEditor.tsx        # Editor rendering — toolbar, ProseMirror, link dialog/bubble
├── EditorFooter.tsx        # Word/char count, auto-save countdown, last saved time
├── TiptapToolbar.tsx       # Formatting buttons (data-driven), tooltips with shortcut hints
├── LinkDialog.tsx          # Add/edit/remove link — shared by Ctrl/Cmd+K and the toolbar button
├── LinkBubbleMenu.tsx      # Open/copy/edit/unlink when the cursor is on a link
├── LinkExtension.ts        # SafeLink — Link mark config, `[text](url)` input rule, href guard
├── shortcuts.ts            # Shortcut table + platform-aware labels (⌘ vs Ctrl)
├── useTiptapEditor.ts      # Hook — configures TipTap extensions (StarterKit, SafeLink, Image, etc.)
├── useFileUpload.ts        # File upload — paste/drop handling, size validation, placeholder nodes
├── useEditorExport.ts      # Export to markdown (Turndown) and HTML, with title injection
├── contentMigration.ts     # BlockNote JSON → TipTap JSON migration (runs on content load)
└── index.module.css        # All editor styles — prose typography, toolbar, footer, mobile
```

## Component Tree

```
SingleNoteEditor
├── EditorHeader        — title, actions, folder/tag pickers
├── ErrorBoundary
│   └── TiptapEditor    — React.memo'd, only re-renders on viewMode/note change
│       ├── TiptapToolbar  — formatting buttons (link button opens LinkDialog)
│       ├── EditorContent  — ProseMirror (editor mode)
│       └── Markdown       — react-markdown preview (markdown mode)
└── EditorFooter        — word count + auto-save status
```

## Data Flow

```
Note loaded from Redux
  → migrateContent() converts BlockNote → TipTap if needed
  → TipTap editor initialized with ProseMirror JSON

User types
  → TipTap onUpdate fires
  → onChange() → markDirty() starts 10s auto-save countdown
  → EditorFooter shows countdown

Auto-save or Ctrl+S
  → editorRef.getContent() → JSON.stringify(editor.getJSON())
  → dispatch(updateNote({ id, updates: { content } }))
  → API PUT /api/v1/notes/:id

File paste/drop
  → useFileUpload inserts placeholder node
  → uploads via POST /api/v1/files
  → replaces placeholder with <img> (images) or <a> (files)
```

## Content Format

Content is stored as a JSON string in the `content` field of each note.

**Current format (TipTap/ProseMirror):**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "text", "text": "world", "marks": [{ "type": "bold" }] }
      ]
    }
  ]
}
```

**Legacy format (BlockNote):** array of blocks. Auto-migrated on load by `contentMigration.ts`:
```json
[
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "text": "Hello " },
      { "type": "text", "text": "world", "styles": { "bold": true } }
    ]
  }
]
```

Migration is one-way. Once a legacy note is saved through TipTap, it's stored in TipTap format permanently.

## TipTap Extensions

Configured in `useTiptapEditor.ts`:

| Extension | Purpose | Config |
|-----------|---------|--------|
| StarterKit | Paragraph, headings, bold, italic, strike, code, lists, blockquote, code block, horizontal rule | defaults |
| SafeLink (`LinkExtension.ts`) | Hyperlinks | `autolink: true`, `linkOnPaste: true`, `openOnClick: false`, **not inclusive** (typing after a link doesn't extend it), `[text](url)` input rule, `isAllowedUri` also runs `isSafeLinkHref` |
| Image | Embedded images | `allowBase64: false` |
| Underline | Underline formatting | defaults |
| TaskList / TaskItem | Checklists | `nested: true` |
| Placeholder | Empty-state hints | Empty doc → `Editor.Placeholder` (mentions `#` / `-`); empty heading under the cursor → `Editor.Heading1..3` |

## Keyboard & Markdown Shortcuts

Everything in the toolbar is reachable from the keyboard. Tooltips show the binding for the
current platform plus the Markdown trigger (from `shortcuts.ts`, which mirrors StarterKit's bindings).

| Action | Keys (`Mod` = Ctrl / ⌘) | Type instead |
|--------|------------------------|--------------|
| Heading 1 / 2 / 3 | `Mod+Alt+1` / `2` / `3` | `# ` / `## ` / `### ` |
| Bold / Italic / Underline | `Mod+B` / `Mod+I` / `Mod+U` | `**text**` / `*text*` |
| Strikethrough / Inline code | `Mod+Shift+S` / `Mod+E` | `~~text~~` / `` `code` `` |
| Bullet / Numbered / Todo list | `Mod+Shift+8` / `7` / `9` | `- ` / `1. ` / `[ ] ` |
| Indent / Outdent (in lists) | `Tab` / `Shift+Tab` | |
| Quote / Code block | `Mod+Shift+B` / `Mod+Alt+C` | `> ` / ```` ``` ```` |
| Divider | | `---` |
| Link | `Mod+K` (add, edit, or clear the URL to remove) | `[text](url)` |
| Save | `Mod+S` | |
| Focus mode | `Mod+Shift+Enter` (Esc exits) | |

## Focus Mode

A distraction-free view owned by `SingleNoteEditor` (`focusMode` state, not persisted). Toggled by the
button next to the title or `Mod+Shift+Enter`; `Esc` exits unless a popover already handled it, and it
switches off when the tab becomes inactive. It is CSS-only (`.focusMode` in `index.module.css`): the
editor container goes `position: fixed` over the app (z-index 1250 — above the drawer, below MUI
popovers so link dialogs and menus still work), the toolbar and note controls are hidden, and the title,
text and footer sit in a centered 46rem column. `TiptapEditor` doesn't re-render on toggle.
On the mobile layout the container stays in flow (the editor already fills the screen and the app
chrome auto-hides on scroll; ancestors there create stacking contexts), so only the toolbar and
controls are dropped.

## Toolbar

- One row of four groups: headings · inline marks + link · lists + indent · blocks + insert.
- Muted icons; the active state is a soft `action.selected` pill with `aria-pressed`.
- Indent/outdent are **disabled** (not hidden) outside lists so nothing shifts under the pointer.
- One "Insert image or file" button — the upload path decides image vs. file embed.
- The link button always opens `LinkDialog` (same as `Mod+K`); unlinking lives in the dialog and the bubble menu.
- Touch devices (`pointer: coarse`) get 40px targets; on narrow screens the row scrolls horizontally.

## Security

**Link URL validation** (`linkUtils.ts`, used by LinkDialog, LinkBubbleMenu, SafeLink + contentMigration):
- Blocks `javascript:`, `data:`, `vbscript:` protocols
- Auto-prefixes `https://` when no protocol specified
- Every href reaching the Link mark (autolink, paste, parsed HTML, `[text](url)`, commands) also passes
  `isSafeLinkHref`, which strips whitespace/control characters before checking the protocol
- An invalid URL in the link dialog shows an inline error instead of silently closing
- All links render with `target="_blank" rel="noopener noreferrer"`

**File uploads** (useFileUpload):
- 100 MB size limit (client-side)
- MIME type whitelist — SVG excluded (XSS risk)
- `allowBase64: false` on Image extension prevents data URI injection

**Markdown preview** (TiptapEditor):
- Uses `react-markdown` without `rehype-raw` — raw HTML is escaped
- Custom `<a>` component blocks dangerous protocols

**Export** (useEditorExport):
- HTML export escapes the title via `textContent → innerHTML`
- Body is TipTap's schema-validated output (only registered node types render)

## Imperative Handle

`TiptapEditor` exposes three methods via `forwardRef` + `useImperativeHandle`:

```typescript
interface TiptapEditorHandle {
  getContent: () => Promise<string>;      // Returns JSON.stringify(editor.getJSON())
  exportTo: (format, title?) => Promise<{ blob: Blob }>;
  getStats: () => { wordCount: number; charCount: number };
}
```

Used by `SingleNoteEditor` for saving, exporting, and displaying word count.

## Performance

`TiptapEditor` is wrapped in `React.memo`. It only re-renders when:
- `viewMode` changes (editor ↔ markdown toggle)
- `noteId` changes (different note selected)
- `initialContent` changes (note remount via ErrorBoundary `key`)

Auto-save countdown ticks and parent state changes do **not** cause TiptapEditor to re-render. The `EditorFooter` receives countdown/stats props directly from `SingleNoteEditor`.

## Auto-Save

Managed by `useAutoSave` hook in `SingleNoteEditor`:

1. User edits → `markDirty()` starts 10-second countdown
2. Each subsequent edit resets the countdown
3. When countdown reaches 0, `performSave()` fires
4. `Ctrl+S` calls `saveNow()` — saves immediately, cancels pending timer
5. On unmount, `flush()` attempts a best-effort save
6. `beforeunload` event warns if there are unsaved changes

## View Modes

Toggled via `EditorHeader`:

- **Editor** — TipTap ProseMirror with toolbar, file input, drag-and-drop
- **Markdown** — Read-only preview rendered by `react-markdown` + `remarkGfm`

## Testing

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `contentMigration.test.ts` | 27 | BlockNote→TipTap migration, all block types, XSS protocol stripping |
| `useAutoSave.test.ts` | 13 | Countdown, timer reset, save triggers, flush, cleanup |
| `useFileUpload.test.ts` | 10 | Upload success/error, offline, size limit, noteId routing |
| `useEditorExport.test.ts` | 11 | Markdown/HTML export, title escaping, XSS prevention |
| `linkValidation.test.ts` | 22 | Protocol blocking, URL normalization, `isSafeLinkHref`, edge cases |
| `LinkExtension.test.ts` | 7 | `[text](url)` input rule, non-inclusive mark, dangerous hrefs rejected |
| `LinkDialog.test.tsx` | 3 | Link selection, inline error on unsafe URL, clear-to-unlink |
| `TiptapToolbar.test.tsx` | 5 | Link button → dialog, insert button, indent disabled outside lists, aria-pressed, tooltip hints |
| `shortcuts.test.ts` | 4 | Platform-aware shortcut labels |
| `SingleNoteEditor.test.tsx` | 7 | Save guards (ADR 0009), focus mode shortcuts, Ctrl+Shift+S doesn't save |
| `EditorHeader.test.tsx` | 24 | Header actions, mobile controls, focus-mode toggle |
| `EditorFooter.test.tsx` | 7 | Component rendering, all display states |
| `editor.spec.ts` (E2E) | 3 | Save→reload persistence, title update, unsaved indicator |
