# Project Structure

The frontend follows a feature-oriented structure with Redux slices and a hand-written API layer.

## Top-Level Layout

```text
src/
├── components/      # Shared shell and cross-feature UI
├── config/          # Runtime config and constants
├── features/
│   ├── auth/        # Keycloak bootstrap and protected routes
│   └── notes/       # Notes domain UI, state, services, and types
├── hooks/           # Reusable UI hooks
├── i18n/            # Translation setup
├── lib/             # Shared runtime helpers like apiManager
├── pages/           # Route-level pages
├── store/           # Global Redux store and app-level slices
└── theme/           # MUI theming
```

## Notes Feature

```text
features/notes/
├── components/
│   ├── NoteEditor/
│   ├── NoteList/
│   ├── NotesSidebar/
│   ├── EditorPanel/
│   └── EditorTabs/
├── services/
│   ├── notesApi.ts
│   └── filesApi.ts
├── store/
│   ├── notesSlice.ts
│   ├── foldersSlice.ts
│   └── tagsSlice.ts
└── types/
    └── index.ts
```

## App-Level Store

`src/store/` contains state that crosses feature boundaries:

- `authSlice.ts`
- `uiSlice.ts`
- `tabsSlice.ts`
- `notificationsSlice.ts`
- persistence middleware for UI and tabs

## Current Architectural Rules

- Components do not call Axios directly; the service layer does.
- Async API work lives in Redux thunks.
- UI-only persistence uses `localStorage`.
- The editor is feature-local and only the active tab mounts a TipTap instance.
- Documentation should describe the current Redux/Axios app, not a planned offline architecture.
