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
  tagsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { tagsSlice, createTag, updateTag, deleteTag } from './tagsSlice';
import { notificationsSlice } from '@/store/notificationsSlice';
import type { Notification } from '@/store/notificationsSlice';
import { tagsApi } from '../services/notesApi';

const mockedApi = vi.mocked(tagsApi);

function createTestStore() {
  return configureStore({
    reducer: {
      tags: tagsSlice.reducer,
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

describe('tagsSlice error handling with ProblemDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show server detail when createTag fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.create.mockRejectedValue(
      problemDetails('Tag name already exists.'),
    );

    await store.dispatch(createTag({ name: 'Duplicate' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tag name already exists.');
  });

  it('should show fallback when createTag fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.create.mockRejectedValue(new Error('Network Error'));

    await store.dispatch(createTag({ name: 'Test' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tags.CreateError');
  });

  it('should show server detail when updateTag fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(
      problemDetails('Tag color must be a valid hex value.'),
    );

    await store.dispatch(updateTag({ id: 'tag-1', updates: { color: 'invalid' } }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tag color must be a valid hex value.');
  });

  it('should show fallback when updateTag fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.update.mockRejectedValue(new Error('timeout'));

    await store.dispatch(updateTag({ id: 'tag-1', updates: { name: 'x' } }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tags.UpdateError');
  });

  it('should show server detail when deleteTag fails with ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(
      problemDetails('Tag is in use by notes.'),
    );

    await store.dispatch(deleteTag('tag-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tag is in use by notes.');
  });

  it('should show fallback when deleteTag fails without ProblemDetails', async () => {
    const store = createTestStore();
    mockedApi.delete.mockRejectedValue(new Error('500'));

    await store.dispatch(deleteTag('tag-1'));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Tags.DeleteError');
  });

  it('should not show error on successful tag creation', async () => {
    const store = createTestStore();
    mockedApi.create.mockResolvedValue('new-tag-id');

    await store.dispatch(createTag({ name: 'Success' }));

    const errors = getErrorNotifications(store);
    expect(errors).toHaveLength(0);
    const successes = store.getState().notifications.notifications.filter(
      (n: Notification) => n.variant === 'success',
    );
    expect(successes).toHaveLength(1);
    expect(successes[0].message).toBe('Tag created');
  });
});
