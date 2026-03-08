# Editor Architecture

The note editor uses [TipTap](https://tiptap.dev/) (ProseMirror-based) for rich text editing. It replaced BlockNote in March 2026.

## File Structure

```
NoteEditor/
├── SingleNoteEditor.tsx    # Orchestrator — save logic, auto-save, state, keyboard shortcuts
├── EditorHeader.tsx        # Title input, folder/tag pickers, pin, delete, export, view toggle
├── TiptapEditor.tsx        # Editor rendering — toolbar, ProseMirror, markdown preview
├── EditorFooter.tsx        # Word/char count, auto-save countdown, last saved time
├── TiptapToolbar.tsx       # Formatting buttons, link popover with URL validation
├── useTiptapEditor.ts      # Hook — configures TipTap extensions (StarterKit, Link, Image, etc.)
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
│       ├── TiptapToolbar  — formatting buttons, link input
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
| Link | Hyperlinks | `autolink: false`, `linkOnPaste: false`, `openOnClick: false` |
| Image | Embedded images | `allowBase64: false` |
| Underline | Underline formatting | defaults |
| Placeholder | Empty editor placeholder text | i18n key `Editor.Placeholder` |

## Security

**Link URL validation** (TiptapToolbar + contentMigration):
- Blocks `javascript:`, `data:`, `vbscript:` protocols
- Auto-prefixes `https://` when no protocol specified
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
| `linkValidation.test.ts` | 15 | Protocol blocking, URL normalization, edge cases |
| `EditorFooter.test.tsx` | 7 | Component rendering, all display states |
| `editor.spec.ts` (E2E) | 3 | Save→reload persistence, title update, unsaved indicator |
