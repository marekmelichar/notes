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

vi.mock('../services/notesApi', () => ({
  foldersApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { foldersSlice, createFolder, updateFolder, deleteFolder } from './foldersSlice';
import { notificationsSlice } from '@/store/notificationsSlice';
import type { Notification } from '@/store/notificationsSlice';
import { foldersApi } from '../services/notesApi';

const mockedApi = vi.mocked(foldersApi);

function createTestStore() {
  return configureStore({
    reducer: {
      folders: foldersSlice.reducer,
      notifications: notificationsSlice.reducer,
    },
  });
}

function problemDetails(detail: string, status = 400): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data: {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status,
      detail,
      traceId: '0HNV76DA8TJHJ:00000001',
    },
    status,
    statusText: 'Bad Request',
    headers,
    config: { headers },
  });
}

function getErrorNotifications(store: ReturnType<typeof createTestStore>): Notification[] {
  return store.getState().notifications.notifications.filter(
    (n: Notification) => n.variant === 'error',
  );
}

describe('foldersSlice error handling with ProblemDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show server detail when createFolder fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.getAll.mockResolvedValue([]);
    mockedApi.create.mockRejectedValue(
      problemDetails('Folder name must not be empty.'),
    );

    await store.dispatch(createFolder({ name: '' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Folder name must not be empty.');
  });

  it('should show fallback when createFolder fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.getAll.mockResolvedValue([]);
    mockedApi.create.mockRejectedValue(new Error('Network Error'));

    await store.dispatch(createFolder({ name: 'Test' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Folders.CreateError');
  });

  it('should show "Circular reference detected." when updateFolder triggers it', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(
      problemDetails('Circular reference detected.'),
    );

    await store.dispatch(updateFolder({
      id: 'folder-1',
      updates: { parentId: 'folder-3' },
    }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Circular reference detected.');
  });

  it('should show fallback when updateFolder fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(new Error('timeout'));

    await store.dispatch(updateFolder({
      id: 'folder-1',
      updates: { name: 'Renamed' },
    }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Folders.UpdateError');
  });

  it('should show server detail when deleteFolder fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(
      problemDetails('Cannot delete folder with notes.'),
    );

    await store.dispatch(deleteFolder('folder-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Cannot delete folder with notes.');
  });

  it('should show fallback when deleteFolder fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(new Error('500'));

    await store.dispatch(deleteFolder('folder-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Folders.DeleteError');
  });

  it('should not show error on successful folder creation', async () => {
    const store = createTestStore();
    mockedApi.getAll.mockResolvedValue([]);
    mockedApi.create.mockResolvedValue('new-folder-id');

    await store.dispatch(createFolder({ name: 'New Folder' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(0);
    const successes = store.getState().notifications.notifications.filter(
      (n: Notification) => n.variant === 'success',
    );
    expect(successes).toHaveLength(1);
    expect(successes[0].message).toBe('Folder created');
  });
});
