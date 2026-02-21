# Error Handling

Cross-project documentation for how errors flow from the API to the user's screen.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  .NET API                                                       │
│                                                                 │
│  Controller                                                     │
│    ├── Problem(detail: "...", statusCode: 400)  → 400 + JSON    │
│    ├── NotFound()                               → 404 + JSON    │
│    ├── Model validation fail                    → 400 + JSON    │
│    └── Unhandled exception                      → 500 + JSON    │
│                                                                 │
│  All errors return RFC 7807 ProblemDetails:                     │
│  { type, title, status, detail, traceId, errors? }              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP + JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  React UI                                                       │
│                                                                 │
│  Axios (apiManager)                                             │
│    └── AxiosError.response.data = ProblemDetails                │
│           │                                                     │
│           ▼                                                     │
│  getApiErrorMessage(error, fallback)                            │
│    ├── Has ProblemDetails.detail? → return detail               │
│    ├── Plain string response?    → return string                │
│    └── Otherwise                 → return fallback              │
│           │                                                     │
│           ▼                                                     │
│  dispatch(showError(message))  or  enqueueSnackbar(message)     │
│           │                                                     │
│           ▼                                                     │
│  User sees snackbar with the server's error message             │
└─────────────────────────────────────────────────────────────────┘
```

## API Side (.NET)

### ProblemDetails Configuration

`api/EpoznamkyApi/Program.cs`:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
    };
});
```

This ensures every error response includes a `traceId` for debugging.

### How to Return Errors

Use `Problem()` for client errors with a message:

```csharp
return Problem(detail: "Search query must not exceed 200 characters.", statusCode: 400);
```

Use `NotFound()` when a resource doesn't exist:

```csharp
return NotFound();
```

**Never use `BadRequest("string")`** — it returns plain text, not ProblemDetails JSON.

### Response Format

Every error response is RFC 7807 JSON:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Search query must not exceed 200 characters.",
  "traceId": "0HNV76DA8TJHJ:00000001"
}
```

Model validation errors include an `errors` field:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Title": ["The Title field is required."]
  },
  "traceId": "0HNV76DA8TJHJ:00000002"
}
```

### All Error Sites

| Controller | Error | Status | Detail |
|---|---|---|---|
| `NotesController` | Search query too long | 400 | "Search query must not exceed 200 characters." |
| `FoldersController` | Circular parent reference | 400 | "Circular reference detected." |
| `UsersController` | Email query too long | 400 | "Email search query must not exceed 320 characters." |
| `FilesController` | Empty file | 400 | "File is empty." |
| `FilesController` | File too large | 400 | "File exceeds maximum allowed size." |
| `FilesController` | Bad extension | 400 | "File type not allowed." |
| `FilesController` | Bad content type | 400 | "File content type not allowed." |
| All controllers | Resource not found | 404 | (title only: "Not Found") |
| All controllers | Invalid model | 400 | (validation errors object) |
| Middleware | No auth token | 401 | (title only: "Unauthorized") |

## UI Side (React + TypeScript)

### Core Utility

`ui/src/lib/apiError.ts`:

```typescript
import { AxiosError } from 'axios';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

function isProblemDetails(data: unknown): data is ProblemDetails {
  return typeof data === 'object' && data !== null && 'status' in data;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError && error.response) {
    const { data } = error.response;

    if (isProblemDetails(data) && data.detail) {
      return data.detail;
    }

    if (typeof data === 'string' && data.length > 0 && data.length < 500) {
      return data;
    }
  }

  return fallback;
}
```

**Priority:** ProblemDetails `detail` > plain text response > fallback string.

### Usage in Redux Thunks

All async thunks follow the same pattern:

```typescript
import { getApiErrorMessage } from '@/lib';

export const createNote = createAsyncThunk('notes/create', async (args, { dispatch }) => {
  try {
    // ... API call
  } catch (error) {
    dispatch(showError(getApiErrorMessage(error, 'Failed to create note')));
    return rejectWithValue(null);
  }
});
```

The fallback string is always in English (hardcoded) — it only shows when the server response has no `detail` field (network errors, timeouts, etc.).

### Usage in Components

For components that call APIs directly (not through Redux):

```typescript
import { getApiErrorMessage } from '@/lib';

try {
  const response = await filesApi.upload(file, noteId);
  return response.url;
} catch (err) {
  const detail = getApiErrorMessage(err, t('Files.UploadError'));
  enqueueSnackbar(detail, { variant: 'error' });
  throw err;
}
```

Here the fallback uses i18n (`t()`) because the component has access to the translation hook.

### Where Errors Are Handled

| Location | Errors | Notification |
|---|---|---|
| `notesSlice.ts` | create, update, delete, restore, permanentDelete | Redux `showError()` |
| `foldersSlice.ts` | create, update, delete | Redux `showError()` |
| `tagsSlice.ts` | create, update, delete | Redux `showError()` |
| `BlockNoteWrapper.tsx` | file upload | notistack `enqueueSnackbar()` |
| `SearchDialog/index.tsx` | search | Redux `showError()` |
| `apiManager.tsx` interceptor | 401 (session expired) | Keycloak redirect |

### Adding Error Handling to New Code

1. Import the utility:
   ```typescript
   import { getApiErrorMessage } from '@/lib';
   ```

2. Wrap the API call in try/catch:
   ```typescript
   try {
     await someApi.doThing();
   } catch (error) {
     dispatch(showError(getApiErrorMessage(error, 'Operation failed')));
   }
   ```

3. The server's ProblemDetails `detail` message will be shown to the user if available; otherwise the fallback string is used.

## MSW Mock Handlers

Mock handlers (`ui/src/mocks/handlers.ts`) return ProblemDetails for errors to match the real API:

```typescript
function problemDetails(detail: string, status: number, title: string) {
  return HttpResponse.json(
    {
      type: `https://tools.ietf.org/html/rfc7231#section-6.5.${status === 404 ? '4' : '1'}`,
      title,
      status,
      detail,
      traceId: `mock-${Date.now()}`,
    },
    { status },
  );
}
```

## Tests

### Unit Tests

`ui/src/lib/apiError.test.ts` — 9 tests covering:
- ProblemDetails with `detail` field
- ProblemDetails without `detail` (uses fallback)
- Plain text response (legacy compatibility)
- Non-Axios errors
- Network errors (no response)
- Empty and oversized strings

### Integration Tests

Each Redux slice has tests that verify error messages propagate correctly:

| Test File | Tests | Covers |
|---|---|---|
| `notesSlice.test.ts` | 11 | create, update, delete, restore, permanentDelete |
| `foldersSlice.test.ts` | 7 | create, update, delete |
| `tagsSlice.test.ts` | 7 | create, update, delete |

Each operation is tested with both:
- **ProblemDetails error** → shows server's `detail` message
- **Non-ProblemDetails error** → shows hardcoded fallback

Run tests:
```bash
cd ui && npx vitest run src/lib/apiError.test.ts src/features/notes/store/*.test.ts
```

## Key Files

| File | Role |
|---|---|
| `api/EpoznamkyApi/Program.cs` | ProblemDetails middleware config |
| `api/EpoznamkyApi/Controllers/*.cs` | `Problem()` calls for validation errors |
| `ui/src/lib/apiError.ts` | `getApiErrorMessage()` utility |
| `ui/src/lib/apiError.test.ts` | Unit tests for error extraction |
| `ui/src/features/notes/store/*Slice.ts` | Redux thunks with error handling |
| `ui/src/features/notes/store/*Slice.test.ts` | Integration tests |
| `ui/src/features/notes/components/NoteEditor/BlockNoteWrapper.tsx` | File upload error handling |
| `ui/src/components/SearchDialog/index.tsx` | Search error handling |
| `ui/src/mocks/handlers.ts` | MSW mock error responses |
