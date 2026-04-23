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
  };
});

// Mock i18n — return the key as-is
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

// Mock the API service
vi.mock('../services/notesApi', () => ({
  notesApi: {
    getList: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    permanentDelete: vi.fn(),
    restore: vi.fn(),
    search: vi.fn(),
    searchList: vi.fn(),
    reorderNotes: vi.fn(),
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
      problemDetails('Cannot delete a note that no longer exists.'),
    );

    await store.dispatch(deleteNote('note-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Cannot delete a note that no longer exists.');
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
    mockedApi.create.mockResolvedValue({
      id: 'new-id',
      title: 'Success',
      content: '',
      folderId: null,
      tags: [],
      isPinned: false,
      isDeleted: false,
      deletedAt: null,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedAt: null,
    });

    await store.dispatch(createNote({ title: 'Success' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(0);
  });
});

describe('notesSlice optimistic concurrency (ADR 0009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function sampleNote(overrides: Partial<import('../types').Note> = {}): import('../types').Note {
    return {
      id: 'note-1',
      title: 'Title',
      content: 'server content',
      folderId: null,
      tags: [],
      isPinned: false,
      isDeleted: false,
      deletedAt: null,
      order: 0,
      createdAt: 1000,
      updatedAt: 2000,
      syncedAt: null,
      ...overrides,
    };
  }

  it('forwards the cached server updatedAt when the update contains content', async () => {
    const store = createTestStore();
    // Seed the detail cache — mirrors what loadNoteDetail.fulfilled does.
    const seed = sampleNote({ updatedAt: 5555 });
    mockedApi.create.mockResolvedValue(seed);
    await store.dispatch(createNote({ title: 'seed' }));

    mockedApi.update.mockResolvedValue(sampleNote({ updatedAt: 6666 }));

    await store.dispatch(updateNote({ id: seed.id, updates: { content: 'new' } }));

    expect(mockedApi.update).toHaveBeenCalledTimes(1);
    const [, body] = mockedApi.update.mock.calls[0];
    expect(body).toMatchObject({ content: 'new', updatedAt: 5555 });
  });

  it('omits updatedAt for metadata-only updates', async () => {
    const store = createTestStore();
    const seed = sampleNote({ updatedAt: 5555 });
    mockedApi.create.mockResolvedValue(seed);
    await store.dispatch(createNote({ title: 'seed' }));

    mockedApi.update.mockResolvedValue(sampleNote({ isPinned: true }));

    await store.dispatch(updateNote({ id: seed.id, updates: { isPinned: true } }));

    const [, body] = mockedApi.update.mock.calls[0];
    expect(body).not.toHaveProperty('updatedAt');
  });

  it('marks the note conflicted and surfaces the server detail on 409', async () => {
    const store = createTestStore();
    const seed = sampleNote();
    mockedApi.create.mockResolvedValue(seed);
    await store.dispatch(createNote({ title: 'seed' }));

    mockedApi.update.mockRejectedValue(
      problemDetails('This note was changed elsewhere. Reload to see the newer version.', 409),
    );

    await store.dispatch(updateNote({ id: seed.id, updates: { content: 'x' } }));

    const state = store.getState().notes;
    expect(state.conflictedNoteIds[seed.id]).toBe(
      'This note was changed elsewhere. Reload to see the newer version.',
    );
    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe(
      'This note was changed elsewhere. Reload to see the newer version.',
    );
  });

  it('blocks subsequent saves once a note is conflicted (no API call)', async () => {
    const store = createTestStore();
    const seed = sampleNote();
    mockedApi.create.mockResolvedValue(seed);
    await store.dispatch(createNote({ title: 'seed' }));

    mockedApi.update.mockRejectedValueOnce(problemDetails('conflict', 409));
    await store.dispatch(updateNote({ id: seed.id, updates: { content: 'x' } }));
    expect(mockedApi.update).toHaveBeenCalledTimes(1);

    // Second save must be short-circuited by the slice before calling the API.
    await store.dispatch(updateNote({ id: seed.id, updates: { content: 'y' } }));
    expect(mockedApi.update).toHaveBeenCalledTimes(1);
  });

  it('clears the conflict flag via the clearNoteConflict reducer', async () => {
    const store = createTestStore();
    const seed = sampleNote();
    mockedApi.create.mockResolvedValue(seed);
    await store.dispatch(createNote({ title: 'seed' }));

    mockedApi.update.mockRejectedValueOnce(problemDetails('conflict', 409));
    await store.dispatch(updateNote({ id: seed.id, updates: { content: 'x' } }));
    expect(store.getState().notes.conflictedNoteIds[seed.id]).toBeDefined();

    store.dispatch(notesSlice.actions.clearNoteConflict(seed.id));
    expect(store.getState().notes.conflictedNoteIds[seed.id]).toBeUndefined();
  });
});
