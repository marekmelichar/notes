# API Integration

The frontend currently uses a hand-written Axios client plus Redux async thunks.

## Current Flow

```text
Component
  -> Redux thunk
  -> features/notes/services/*.ts
  -> lib/apiManager.ts
  -> ASP.NET API
```

## Core Pieces

### `src/lib/apiManager.ts`

The shared Axios instance is responsible for:

- using the configured API base URL
- attaching the current bearer token from Redux or Keycloak memory
- retrying one time after a `401` via Keycloak token refresh
- surfacing session-expired UX when refresh fails
- marking initial access as authorized or unauthorized

### `src/features/notes/services/notesApi.ts`

This file contains the hand-written notes, folders, tags, and files clients.

Current design choices:

- full entities are returned from create and update calls
- note listing uses the paginated `/api/v1/notes` endpoint and batches pages on the client
- file upload and delete live in `filesApi.ts`

## Why This Matters

The docs previously described generated clients and React Query hooks, but the shipped app does not use them. The single source of truth for request behavior is the hand-written service layer.

## Error Handling

Errors bubble from Axios into thunks, which turn them into user-facing notifications through `notificationsSlice`.

Use `getApiErrorMessage()` when extracting RFC 7807 `ProblemDetails.detail` from API failures.

## Authentication Contract

- The API expects bearer auth for application endpoints.
- File downloads remain anonymous so embedded images and direct links can render in the browser.
- Auth state lives in Redux; token refresh is coordinated with Keycloak.

## Current Recommendation

- Keep request code in the service layer, not directly in components.
- Return full entities from the backend on create and update.
- Treat the service layer as the frontend contract surface, even if the backend evolves internally.
