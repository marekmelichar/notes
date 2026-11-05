# Editor Architecture

The note editor uses [TipTap](https://tiptap.dev/) (ProseMirror-based) for rich text editing. It replaced BlockNote in March 2026.

## File Structure

```
NoteEditor/
├── SingleNoteEditor.tsx    # Orchestrator — save logic, auto-save, state, keyboard shortcuts
├── EditorHeader.tsx        # Title input, folder/tag pickers, pin, delete, export, view toggle
├── TiptapEditor.tsx        # Editor rendering — toolbar, ProseMirror, markdown preview
├── EditorFooter.tsx        # Word/char count, auto-save countdown, last saved time
├── TiptapToolbar.tsx       # Compact formatting bar; secondary marks live in More
├── editorExtensions.ts     # TipTap extension list, safe links, markdown link input
├── useTiptapEditor.ts      # Hook — mounts the extension list and editor props
├── focusPreference.ts      # Focus-mode preference in localStorage
├── shortcutLabel.ts        # Ctrl / ⌘ labels for toolbar tooltips
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
│       ├── TiptapToolbar  — primary formatting; More menu for the rest
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
| StarterKit | Paragraph, headings, bold, italic, strike, code, lists, blockquote, code block, horizontal rule, and their markdown input rules | `link: false`, `underline: false` (registered separately below) |
| SafeLink | Hyperlinks, autolink, `[label](url)` | `autolink: true`, `linkOnPaste: true`, `openOnClick: false`, `defaultProtocol: 'https'`, `inclusive: false`. `isAllowedUri` rejects empty and dangerous protocols |
| Image | Embedded images | `allowBase64: false` |
| Underline | Underline formatting | defaults |
| Task list / item | Checklists | task item `nested: true` |
| File embed | Non-image uploads | custom node |
| Placeholder | Empty editor placeholder text | i18n key `Editor.Placeholder` |

## Writing

The toolbar shows the controls you reach for while drafting: heading, bold, italic, lists, quote, link, and insert. Underline, strike, code, indent, and the horizontal rule sit in **More**, so the bar stays one short row and scrolls less on a phone. Image and file upload share one insert button — they open the same picker.

**Focus mode** (`Ctrl/Cmd+Shift+Enter` toggles, `Esc` leaves; remembered in `notes.editor.focusMode`) hides the toolbar, the note actions, and the footer, and limits the line length to about 68 characters. The title and the focus button stay. `Ctrl/Cmd+S` still saves. The chord avoids `\`, which needs AltGr (reported as Ctrl+Alt) on Czech and German layouts. `Esc` that a popover (link dialog, bubble, menu) already handled does not leave focus mode. An unsaved note shows a dot on the focus button while chrome is hidden.

Markdown-style input and the matching shortcuts come from StarterKit (and are covered by `writingExtensions.test.ts`). Toolbar tooltips and More-menu items show both, e.g. "Bold (Ctrl+B · \*\*text\*\*)":

| Type this | Or press | Result |
|-----------|----------|--------|
| `# `, `## `, `### ` | `Ctrl/Cmd+Alt+1/2/3` | Heading |
| `- ` or `* ` | `Ctrl/Cmd+Shift+8` | Bullet list |
| `1. ` | `Ctrl/Cmd+Shift+7` | Numbered list |
| `[ ] ` | `Ctrl/Cmd+Shift+9` | Todo list |
| `**bold**`, `*italic*` | `Ctrl/Cmd+B`, `Ctrl/Cmd+I` | Bold, italic |
| `[label](url)` | `Ctrl/Cmd+K` | Link |

`[label](url)` runs through the same `validateAndNormalizeUrl` check as the dialog. A `javascript:`, `data:`, or `vbscript:` target is left as typed text. Link marks are not inclusive, so the word you type after a finished link is not swallowed by it.

An empty note's placeholder names the three shortcuts people forget (`#`, `-`, and the link shortcut). It only shows while the document is empty. An empty heading under the caret shows its level ("Heading 2") as a placeholder; empty paragraphs mid-note stay quiet.

**Links.** The toolbar button and `Ctrl/Cmd+K` open one dialog: apply to the selection, edit the link under the caret, or insert text plus a URL. A rejected URL stays in the field with an error instead of closing the dialog. Editing an existing link offers Remove. The bubble (open, copy, edit, remove) appears when you click a link and goes away when you type, move the caret off it, or press `Esc` — it does not follow the caret through a sentence. It reads the URL from the clicked link, not the selection, and clicking another link moves it there.

## Security

**Link URL validation** has two levels:
- **Typed links** (`validateAndNormalizeUrl`: link dialog, bubble edit, markdown `[label](url)` rule, content migration) allow only `http`, `https`, and `mailto`. Other explicit schemes (`ftp://`, `file://`) are rejected instead of being rewritten to `https://ftp://…`. A bare host gets `https://`, including `example.com:8080` and dot-free `localhost:3000`.
- **Stored, pasted, and autolinked links** (`SafeLink.isAllowedUri`, which TipTap also runs on render and parse) use TipTap's own check plus `isSafeLinkHref`. Existing `tel:` or `ftp:` links keep their href, and a link mark with no href renders instead of throwing.
- Both block `javascript:`, `data:`, `vbscript:`, including schemes split by whitespace or control characters (`java\nscript:`), via `isSafeLinkHref`.
- All links render with `target="_blank" rel="noopener noreferrer"`
- `allowBase64: false` on images is unchanged; autolink uses `defaultProtocol: 'https'`

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
| `linkValidation.test.ts` | 24 | Protocol blocking, URL normalization, edge cases |
| `writingExtensions.test.ts` | 12 | Markdown shortcuts, empty-heading placeholder, stored tel:/ftp: links and null href render, validated `[label](url)`, autolink does not swallow the next word |
| `TiptapToolbar.test.tsx` | 5 | Compact toolbar, markdown hints in More, heading menu (re-picking a level keeps it), link button does not unlink |
| `LinkDialog.test.tsx` | 3 | Rejected URL stays open, https normalization, unlink |
| `LinkBubbleMenu.test.tsx` | 5 | Opens on click (not on caret), before mount, shows the clicked link's URL, moves between links, Esc closes before focus mode hears it |
| `focusPreference.test.ts` | 3 | Focus-mode localStorage round-trip |
| `shortcutLabel.test.ts` | 4 | Ctrl vs ⌘ shortcut labels, tooltip hint formatting |
| `EditorFooter.test.tsx` | 7 | Component rendering, all display states |
| `editor.spec.ts` (E2E) | 3 | Save→reload persistence, title update, unsaved indicator |
