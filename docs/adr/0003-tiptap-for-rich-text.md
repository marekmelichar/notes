# 0003. Use TipTap for rich text editing

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

The product needs a rich text editor with: bold/italic/underline, headings, lists, blockquotes, code, links, images, tables, and a maintainable extension API. Notes are stored as HTML in `Note.Content` (max 5 MB).

The realistic options in late 2025/early 2026:

- **TipTap** (ProseMirror-based, React bindings)
- **Lexical** (Meta, React-native first)
- **Slate.js**
- **Quill** / **Editor.js**
- **CKEditor 5**
- Build on raw ProseMirror

## Decision

**Use TipTap** (already on `@tiptap/react`, `@tiptap/starter-kit`, plus a curated set of extensions: heading, bullet-list, ordered-list, blockquote, code, code-block, link, image, table, etc.).

The editor is mounted in `ui/src/features/notes/components/NoteEditor/SingleNoteEditor.tsx`. One active editor instance at a time (tabs are persisted but only the current one mounts).

## Consequences

**Positive:**
- Healthy ecosystem of official + community extensions. Adding a new format = add a package.
- Built on ProseMirror — production-grade text manipulation, sane content model, predictable input rules.
- React-friendly API; no escape hatches needed for typical use.
- HTML in/out matches our storage model — no schema conversion at the boundary.

**Negative:**
- Bundle size: TipTap + its extensions is ~150 KB gzipped. Mitigated by lazy loading (`SingleNoteEditor-q8rXNWf6.js` is its own chunk).
- ProseMirror's mental model is foreign. Customizing input rules / decorations / nodes has a steep curve.
- Plugin churn — TipTap has shipped breaking changes in major versions; each upgrade requires a small migration.

**Neutral:**
- HTML storage means we ship the editor's serializer choices into the database. Switching editors means a content migration.

## Alternatives considered

- **Lexical**: newer, smaller, Meta-backed. Rejected because the React extension ecosystem was thinner at adoption time and tables/lists support was less mature. Worth reconsidering if we ever need IME / accessibility improvements at scale.
- **Slate.js**: highly flexible but everything is opt-in; we'd be writing more glue than feature code.
- **Quill / Editor.js**: lower ceiling on customization; both impose their own data formats.
- **CKEditor 5**: feature-rich but heavyweight, license considerations, less idiomatic in React.
- **Raw ProseMirror**: not enough advantage over TipTap for the cost.

## Notes

We deduplicate `prosemirror-state`, `prosemirror-model`, `prosemirror-view` in `vite.config.ts` to avoid the classic dual-PM-instance bug. If you ever see `RangeError: Mismatched transaction` after upgrading TipTap, check the dedupe list first.
