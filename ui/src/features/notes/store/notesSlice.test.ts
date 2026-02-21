import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders } from 'axios';

// Mock the entire @/lib barrel — keep real getApiErrorMessage, stub apiManager
vi.mock('@/lib', async () => {
  const { getApiErrorMessage } = await vi.importActual<typeof import('@/lib/apiError')>('@/lib/apiError');
  return {
    getApiErrorMessage,
    apiManager: {},
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  };
});

// Mock i18n — return the key as-is
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

// Mock the API service
vi.mock('../services/notesApi', () => ({
  notesApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    permanentDelete: vi.fn(),
    restore: vi.fn(),
    search: vi.fn(),
    reorderNotes: vi.fn(),
    getMaxOrderInFolder: vi.fn(),
    getByFolder: vi.fn(),
  },
}));

import { notesSlice, createNote, updateNote, deleteNote, restoreNote, permanentDeleteNote } from './notesSlice';
import { notificationsSlice } from '@/store/notificationsSlice';
import { tabsSlice } from '@/store/tabsSlice';
import type { Notification } from '@/store/notificationsSlice';
import { notesApi } from '../services/notesApi';

const mockedApi = vi.mocked(notesApi);

function createTestStore() {
  // Stub localStorage for tabsSlice persistence
  const storage: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
  });

  return configureStore({
    reducer: {
      notes: notesSlice.reducer,
      notifications: notificationsSlice.reducer,
      tabs: tabsSlice.reducer,
    },
  });
}

function problemDetails(detail: string, status = 400): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data: {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: status === 400 ? 'Bad Request' : 'Not Found',
      status,
      detail,
      traceId: '0HNV76DA8TJHJ:00000001',
    },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Not Found',
    headers,
    config: { headers },
  });
}

function getErrorNotifications(store: ReturnType<typeof createTestStore>): Notification[] {
  return store.getState().notifications.notifications.filter(
    (n: Notification) => n.variant === 'error',
  );
}

describe('notesSlice error handling with ProblemDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show server detail when createNote fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.getMaxOrderInFolder.mockResolvedValue(0);
    mockedApi.create.mockRejectedValue(
      problemDetails('Note title must not exceed 500 characters.'),
    );

    await store.dispatch(createNote({ title: 'x'.repeat(501) }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Note title must not exceed 500 characters.');
  });

  it('should show fallback when createNote fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.getMaxOrderInFolder.mockResolvedValue(0);
    mockedApi.create.mockRejectedValue(new Error('Network Error'));

    await store.dispatch(createNote({ title: 'Test' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Notes.CreateError');
  });

  it('should show server detail when updateNote fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(
      problemDetails('Content exceeds maximum allowed size.'),
    );

    await store.dispatch(updateNote({ id: 'note-1', updates: { content: 'huge' } }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Content exceeds maximum allowed size.');
  });

  it('should show fallback when updateNote fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(new Error('timeout'));

    await store.dispatch(updateNote({ id: 'note-1', updates: { title: 'x' } }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Notes.SaveError');
  });

  it('should show server detail when deleteNote fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(
      problemDetails('Cannot delete a shared note.'),
    );

    await store.dispatch(deleteNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Cannot delete a shared note.');
  });

  it('should show fallback when deleteNote fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(new Error('500'));

    await store.dispatch(deleteNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Notes.DeleteError');
  });

  it('should show server detail when restoreNote fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.restore.mockRejectedValue(
      problemDetails('Note is not in trash.'),
    );

    await store.dispatch(restoreNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Note is not in trash.');
  });

  it('should show fallback when restoreNote fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.restore.mockRejectedValue(new Error('oops'));

    await store.dispatch(restoreNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Notes.RestoreError');
  });

  it('should show server detail when permanentDeleteNote fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.permanentDelete.mockRejectedValue(
      problemDetails('Note not found.', 404),
    );

    await store.dispatch(permanentDeleteNote('note-999'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Note not found.');
  });

  it('should show fallback when permanentDeleteNote fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.permanentDelete.mockRejectedValue(new Error('fail'));

    await store.dispatch(permanentDeleteNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Notes.DeleteError');
  });

  it('should not show error notification on successful operations', async () => {
    const store = createTestStore();
    mockedApi.getMaxOrderInFolder.mockResolvedValue(0);
    mockedApi.create.mockResolvedValue('new-id');

    await store.dispatch(createNote({ title: 'Success' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(0);
  });
});
