import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PropsWithChildren } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

// Mocked before imports (vi.mock is hoisted). The store pulls in authSlice,
// which runs Keycloak config validation at module load — that relies on
// window.KEYCLOAK_URL. We bypass both by stubbing.
vi.mock('@/config/env', () => ({
  getApiBaseUrl: () => '',
}));
vi.mock('@/features/auth/utils/keycloak', () => ({
  keycloak: { token: undefined, updateToken: () => Promise.resolve(false) },
  initKeycloak: vi.fn(),
  clearScheduledRefresh: vi.fn(),
  setTokenRefreshCallback: vi.fn(),
  setRefreshFailureCallback: vi.fn(),
}));

// Stub MUI useMediaQuery for jsdom (no matchMedia by default for specific queries).
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return { ...actual, useMediaQuery: () => false };
});

// Simple translation passthrough.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The scroll-direction hook reads getBoundingClientRect etc — not relevant here.
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks')>('@/hooks');
  return {
    ...actual,
    useScrollDirection: () => {},
  };
});

// Replace TiptapEditor with a test double whose ref surfaces getContent/isEmpty.
const tiptapState = {
  content: '[]',
  isEmpty: true,
};

vi.mock('./TiptapEditor', () => {
  const Stub = forwardRef<unknown, unknown>((_props, ref) => {
    useImperativeHandle(ref, () => ({
      getContent: async () => tiptapState.content,
      exportTo: async () => ({ blob: new Blob() }),
      getStats: () => ({ wordCount: 0, charCount: 0 }),
      isEmpty: () => tiptapState.isEmpty,
    }));
    return <div data-testid="tiptap-editor-stub" />;
  });
  Stub.displayName = 'TiptapEditorStub';
  return { TiptapEditor: Stub };
});

// Avoid pulling heavy children (header, footer, error fallback) — they're
// tangential to the guard assertion.
vi.mock('./EditorHeader', () => ({
  EditorHeader: () => <div data-testid="editor-header-stub" />,
}));
vi.mock('./EditorFooter', () => ({
  EditorFooter: () => <div data-testid="editor-footer-stub" />,
}));
vi.mock('./EditorErrorFallback', () => ({
  EditorErrorFallback: () => <div data-testid="editor-error-fallback-stub" />,
}));
vi.mock('./contentMigration', () => ({
  migrateContent: (content: string | undefined) => (content ? { type: 'doc' } : undefined),
}));

// Mock the notes API so the updateNote thunk has predictable behavior.
vi.mock('../../services/notesApi', () => ({
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
vi.mock('@/lib', async () => {
  const { getApiErrorMessage } = await vi.importActual<typeof import('@/lib/apiError')>('@/lib/apiError');
  return { getApiErrorMessage, apiManager: {}, getAuthToken: vi.fn() };
});
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

// Keep localStorage happy for tabsSlice persistence.
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
});

import { notesSlice } from '../../store/notesSlice';
import { notificationsSlice } from '@/store/notificationsSlice';
import { tabsSlice } from '@/store/tabsSlice';
import { foldersSlice } from '../../store/foldersSlice';
import { notesApi } from '../../services/notesApi';
import { SingleNoteEditor } from './SingleNoteEditor';
import type { Note } from '../../types';

const mockedApi = vi.mocked(notesApi);

function sampleNote(overrides: Partial<Note> = {}): Note {
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

function buildStore(preloadedNote: Note | null) {
  const store = configureStore({
    reducer: {
      notes: notesSlice.reducer,
      notifications: notificationsSlice.reducer,
      tabs: tabsSlice.reducer,
      folders: foldersSlice.reducer,
    },
  });
  if (preloadedNote) {
    // Route through the public reducer path — same effect as loadNoteDetail.fulfilled.
    store.dispatch({
      type: 'notes/loadNoteDetail/fulfilled',
      payload: preloadedNote,
      meta: { arg: preloadedNote.id, requestId: 'r0', requestStatus: 'fulfilled' },
    });
  }
  return store;
}

function Wrapper({ store, children }: PropsWithChildren<{ store: ReturnType<typeof buildStore> }>) {
  return <Provider store={store}>{children}</Provider>;
}

describe('SingleNoteEditor save guards (ADR 0009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    tiptapState.content = '[]';
    tiptapState.isEmpty = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('does NOT save when the note has not been loaded yet', () => {
    const store = buildStore(null);
    render(
      <Wrapper store={store}>
        <SingleNoteEditor noteId="note-1" isActive />
      </Wrapper>,
    );

    // Without a loaded note the component renders null — no editor, no save.
    expect(screen.queryByTestId('tiptap-editor-stub')).toBeNull();

    // Ctrl+S keydown (the path triggered by the autosave window or user
    // shortcut): since the component is unmounted there's no listener —
    // but even if anything slipped through, the PUT must not fire.
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(mockedApi.update).not.toHaveBeenCalled();
  });

  it('does NOT save an empty editor when the baseline was never non-empty', () => {
    // Newly-created note: server-side content is empty. If the editor remains
    // empty, an autosave would be a no-op wipe — reject it before hitting PUT.
    // This is the exact signature of the 2026-04-23 ghost-tab incident.
    const note = sampleNote({ content: '' });
    const store = buildStore(note);
    tiptapState.isEmpty = true;
    tiptapState.content = '{"type":"doc","content":[{"type":"paragraph"}]}';

    render(
      <Wrapper store={store}>
        <SingleNoteEditor noteId={note.id} isActive />
      </Wrapper>,
    );

    // Ctrl+S → saveNow → performSave. Guard (c) should reject because the
    // editor is empty and baselineEverNonEmpty is false.
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockedApi.update).not.toHaveBeenCalled();
  });

  it('shows a conflict banner when the note is in conflict state', () => {
    const note = sampleNote({ content: 'server content' });
    const store = buildStore(note);
    store.dispatch({
      type: 'notes/updateNote/rejected',
      payload: { conflict: true, message: 'This note was changed elsewhere. Reload to see the newer version.' },
      meta: { arg: { id: note.id, updates: { content: 'x' } }, requestId: 'r1', requestStatus: 'rejected' },
      error: { message: 'Rejected' },
    });

    render(
      <Wrapper store={store}>
        <SingleNoteEditor noteId={note.id} isActive />
      </Wrapper>,
    );

    expect(screen.getByTestId('note-conflict-banner')).toHaveTextContent(
      'This note was changed elsewhere. Reload to see the newer version.',
    );
  });
});
