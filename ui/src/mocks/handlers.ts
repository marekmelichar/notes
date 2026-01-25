/**
 * MSW Request Handlers
 *
 * API mocking for development and testing.
 */

import { http, HttpResponse, delay } from 'msw';
import type { Note, Folder, Tag } from '@/features/notes/types';

// Simulate network delay
const MOCK_DELAY = 100;

// In-memory store for mock data
let mockNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Welcome to notes',
    content: JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is your first note. Start writing!' }],
      },
    ]),
    folderId: 'folder-1',
    tags: ['tag-1'],
    isPinned: true,
    isDeleted: false,
    deletedAt: null,
    sharedWith: [],
    order: 0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    syncedAt: null,
  },
  {
    id: 'note-2',
    title: 'Meeting Notes',
    content: JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Notes from the team meeting.' }],
      },
    ]),
    folderId: 'folder-1',
    tags: [],
    isPinned: false,
    isDeleted: false,
    deletedAt: null,
    sharedWith: [],
    order: 1,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000,
    syncedAt: null,
  },
  {
    id: 'note-3',
    title: 'Shopping List',
    content: JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Milk, bread, eggs' }],
      },
    ]),
    folderId: null,
    tags: ['tag-2'],
    isPinned: false,
    isDeleted: false,
    deletedAt: null,
    sharedWith: [],
    order: 0,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 86400000,
    syncedAt: null,
  },
];

let mockFolders: Folder[] = [
  {
    id: 'folder-1',
    name: 'Work',
    parentId: null,
    color: '#6366f1',
    order: 0,
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now() - 604800000,
  },
  {
    id: 'folder-2',
    name: 'Personal',
    parentId: null,
    color: '#22c55e',
    order: 1,
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now() - 604800000,
  },
  {
    id: 'folder-3',
    name: 'Projects',
    parentId: 'folder-1',
    color: '#f59e0b',
    order: 0,
    createdAt: Date.now() - 432000000,
    updatedAt: Date.now() - 432000000,
  },
];

let mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'Important',
    color: '#ef4444',
  },
  {
    id: 'tag-2',
    name: 'Todo',
    color: '#3b82f6',
  },
  {
    id: 'tag-3',
    name: 'Ideas',
    color: '#8b5cf6',
  },
];

export const handlers = [
  // ============================================
  // NOTES ENDPOINTS
  // ============================================

  // Get all notes
  http.get('/api/v1/notes', async () => {
    await delay(MOCK_DELAY);
    return HttpResponse.json(mockNotes);
  }),

  // Get note by ID
  http.get('/api/v1/notes/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    const note = mockNotes.find((n) => n.id === params.id);
    if (!note) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(note);
  }),

  // Create note
  http.post('/api/v1/notes', async ({ request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Note>;
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: body.title || 'Untitled',
      content: body.content || '',
      folderId: body.folderId ?? null,
      tags: body.tags || [],
      isPinned: body.isPinned || false,
      isDeleted: false,
      deletedAt: null,
      sharedWith: [],
      order: mockNotes.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedAt: null,
    };
    mockNotes.push(newNote);
    return HttpResponse.json(newNote, { status: 201 });
  }),

  // Update note
  http.put('/api/v1/notes/:id', async ({ params, request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Note>;
    const index = mockNotes.findIndex((n) => n.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockNotes[index] = {
      ...mockNotes[index],
      ...body,
      updatedAt: Date.now(),
    };
    return HttpResponse.json(mockNotes[index]);
  }),

  // Delete note (soft delete)
  http.delete('/api/v1/notes/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    const index = mockNotes.findIndex((n) => n.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockNotes[index].isDeleted = true;
    mockNotes[index].deletedAt = Date.now();
    mockNotes[index].updatedAt = Date.now();
    return new HttpResponse(null, { status: 204 });
  }),

  // Permanent delete
  http.delete('/api/v1/notes/:id/permanent', async ({ params }) => {
    await delay(MOCK_DELAY);
    mockNotes = mockNotes.filter((n) => n.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // Restore note
  http.post('/api/v1/notes/:id/restore', async ({ params }) => {
    await delay(MOCK_DELAY);
    const index = mockNotes.findIndex((n) => n.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockNotes[index].isDeleted = false;
    mockNotes[index].deletedAt = null;
    mockNotes[index].updatedAt = Date.now();
    return HttpResponse.json(mockNotes[index]);
  }),

  // Search notes
  http.get('/api/v1/notes/search', async ({ request }) => {
    await delay(MOCK_DELAY);
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const results = mockNotes.filter(
      (n) =>
        !n.isDeleted &&
        (n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query))
    );
    return HttpResponse.json(results);
  }),

  // Reorder notes
  http.post('/api/v1/notes/reorder', async ({ request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as { items: { id: string; order: number }[] };
    body.items.forEach(({ id, order }) => {
      const note = mockNotes.find((n) => n.id === id);
      if (note) {
        note.order = order;
      }
    });
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // FOLDERS ENDPOINTS
  // ============================================

  // Get all folders
  http.get('/api/v1/folders', async () => {
    await delay(MOCK_DELAY);
    return HttpResponse.json(mockFolders);
  }),

  // Get folder by ID
  http.get('/api/v1/folders/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    const folder = mockFolders.find((f) => f.id === params.id);
    if (!folder) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(folder);
  }),

  // Create folder
  http.post('/api/v1/folders', async ({ request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Folder>;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: body.name || 'New Folder',
      parentId: body.parentId ?? null,
      color: body.color || '#6366f1',
      order: mockFolders.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockFolders.push(newFolder);
    return HttpResponse.json(newFolder, { status: 201 });
  }),

  // Update folder
  http.put('/api/v1/folders/:id', async ({ params, request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Folder>;
    const index = mockFolders.findIndex((f) => f.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockFolders[index] = {
      ...mockFolders[index],
      ...body,
      updatedAt: Date.now(),
    };
    return HttpResponse.json(mockFolders[index]);
  }),

  // Delete folder
  http.delete('/api/v1/folders/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    mockFolders = mockFolders.filter((f) => f.id !== params.id);
    // Also remove notes from this folder
    mockNotes = mockNotes.map((n) =>
      n.folderId === params.id ? { ...n, folderId: null } : n
    );
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // TAGS ENDPOINTS
  // ============================================

  // Get all tags
  http.get('/api/v1/tags', async () => {
    await delay(MOCK_DELAY);
    return HttpResponse.json(mockTags);
  }),

  // Get tag by ID
  http.get('/api/v1/tags/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    const tag = mockTags.find((t) => t.id === params.id);
    if (!tag) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(tag);
  }),

  // Create tag
  http.post('/api/v1/tags', async ({ request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Tag>;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: body.name || 'New Tag',
      color: body.color || '#6366f1',
    };
    mockTags.push(newTag);
    return HttpResponse.json(newTag, { status: 201 });
  }),

  // Update tag
  http.put('/api/v1/tags/:id', async ({ params, request }) => {
    await delay(MOCK_DELAY);
    const body = (await request.json()) as Partial<Tag>;
    const index = mockTags.findIndex((t) => t.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockTags[index] = {
      ...mockTags[index],
      ...body,
    };
    return HttpResponse.json(mockTags[index]);
  }),

  // Delete tag
  http.delete('/api/v1/tags/:id', async ({ params }) => {
    await delay(MOCK_DELAY);
    mockTags = mockTags.filter((t) => t.id !== params.id);
    // Also remove tag from notes
    mockNotes = mockNotes.map((n) => ({
      ...n,
      tags: n.tags.filter((t) => t !== params.id),
    }));
    return new HttpResponse(null, { status: 204 });
  }),
];
