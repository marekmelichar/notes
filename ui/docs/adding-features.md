# Adding Features

This guide describes how to add features to the app as it exists today.

## Current Pattern

New product work should fit the current architecture:

- hand-written Axios services in `src/features/*/services/`
- Redux Toolkit slices and thunks for domain state
- CSS Modules for static styling
- MUI components for layout and controls
- feature-local types, components, and tests

Do not assume:

- generated API clients
- React Query hooks
- MSW-powered mock mode
- IndexedDB or offline sync

## Suggested Feature Layout

```text
src/features/
└── reminders/
    ├── components/
    │   └── ReminderList/
    │       ├── index.tsx
    │       └── index.module.css
    ├── services/
    │   └── remindersApi.ts
    ├── store/
    │   ├── remindersSlice.ts
    │   └── remindersSlice.test.ts
    ├── types/
    │   └── index.ts
    └── utils/
        └── reminderValidation.ts
```

## Step By Step

### 1. Define the API contract

Add or update backend request and response DTOs first. The frontend now relies on the server returning authoritative entities for create and update flows, including IDs, timestamps, and order values.

### 2. Add the frontend types

Keep feature types in `src/features/<feature>/types/`. Match the API contract closely so the service layer stays thin.

### 3. Create the service layer

Use the shared Axios client from `src/lib/apiManager.ts`. Keep service functions small and predictable.

```typescript
import api from '@/lib/apiManager';
import type { Reminder, CreateReminderRequest } from '../types';

const API_PREFIX = '/api/v1';

export const remindersApi = {
  async getAll(): Promise<Reminder[]> {
    const response = await api.get<Reminder[]>(`${API_PREFIX}/reminders`);
    return response.data;
  },

  async create(data: CreateReminderRequest): Promise<Reminder> {
    const response = await api.post<Reminder>(`${API_PREFIX}/reminders`, data);
    return response.data;
  },
};
```

### 4. Add Redux state

Put async flows in the slice with `createAsyncThunk`. Let the thunk call the service, then store the authoritative server response in Redux instead of fabricating timestamps or IDs in the client.

### 5. Build components around selectors and actions

Feature components should read state with selectors and dispatch thunk actions. Keep API calls out of component bodies unless there is a very strong reason not to.

### 6. Add tests close to the slice or component

At minimum:

- service-level happy path coverage if the contract is non-trivial
- slice tests for fulfilled and rejected thunk flows
- component tests for key interaction paths

## Guardrails

- Validate ownership and foreign-key relationships on the server, not just in the UI.
- Return full entities from create and update endpoints.
- Prefer one mounted rich editor instance per active note view.
- Use paginated fetching for large note collections; do not reintroduce `limit=0`.
- Keep docs truthful. If the architecture changes, update the relevant docs in the same change.
