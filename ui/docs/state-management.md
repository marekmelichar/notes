# State Management

The frontend currently uses Redux Toolkit for both application state and server-backed domain state.

## Current Model

| State Type | Current Solution | Notes |
|------------|------------------|-------|
| Auth state | Redux slice | Session status, user info, access status |
| UI state | Redux slice + localStorage-backed middleware | Mobile layout, collapsed panels, open tabs |
| Notes data | Redux slices + async thunks | Notes, folders, and tags are loaded from the API |
| Editor state | Local React state + TipTap state | Title, save state, editor content lifecycle |

There is no React Query layer in the shipped app today.

## Store Structure

`src/store/index.ts`

```ts
auth
ui
notifications
tabs
notes
folders
tags
```

## Notes Domain Flow

```text
UI Component
  -> dispatch(async thunk)
  -> hand-written service in features/notes/services
  -> apiManager Axios client
  -> API
  -> fulfilled/rejected reducer
  -> Redux state update + notification
```

## Important Slices

- `authSlice.ts`: authentication state and Keycloak bootstrap
- `uiSlice.ts`: mobile view, collapse state, layout flags
- `tabsSlice.ts`: open editor tabs and active tab
- `notesSlice.ts`: note loading, filtering, sorting, CRUD
- `foldersSlice.ts`: folder tree state and CRUD
- `tagsSlice.ts`: tag CRUD
- `notificationsSlice.ts`: snackbar messages bridged into notistack

## Persistence

The app persists a few UI-only concerns in `localStorage`:

- sidebar collapse state
- note list collapse/hidden state
- panel widths
- open tabs and active tab
- theme and primary color

Auth tokens are not persisted to `localStorage`; the request layer reads them from Redux or Keycloak memory.

## Selectors

The notes feature relies on memoized selectors for derived state such as:

- filtered and sorted note lists
- note counts for the sidebar
- root and child folders
- tag lookup by id list

## Guidance

- Put cross-screen data in Redux only when more than one part of the app depends on it.
- Keep editor-specific interaction state local unless another feature needs it.
- Prefer returning full entities from the API on create/update so Redux does not invent server state.
