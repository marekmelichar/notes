import { apiManager } from '@/lib';
import type { Note, NoteListItem, Folder, Tag, NotesFilter, NotesSortBy, NotesSortOrder } from '../types';

const API_BASE = '/api/v1';

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
}

export interface GetListParams {
  filter: NotesFilter;
  sortBy: NotesSortBy;
  sortOrder: NotesSortOrder;
  limit?: number;
  offset?: number;
}

// Note operations via API
export const notesApi = {
  async getList(params: GetListParams): Promise<PaginatedResponse<NoteListItem>> {
    const { filter, sortBy, sortOrder, limit = 0, offset = 0 } = params;
    const queryParams: Record<string, string | number | boolean> = {
      limit,
      offset,
      sortBy,
      sortOrder,
      isDeleted: filter.isDeleted,
    };

    if (filter.folderId !== null) {
      queryParams.folderId = filter.folderId;
    }
    if (filter.tagIds.length > 0) {
      queryParams.tagIds = filter.tagIds.join(',');
    }
    if (filter.isPinned !== null) {
      queryParams.isPinned = filter.isPinned;
    }

    const response = await apiManager.get<PaginatedResponse<NoteListItem>>(
      `${API_BASE}/notes/list`,
      { params: queryParams },
    );
    return response.data;
  },

  async getById(id: string): Promise<Note> {
    const response = await apiManager.get<Note>(`${API_BASE}/notes/${id}`);
    return response.data;
  },

  async create(note: Pick<Note, 'title' | 'content' | 'folderId' | 'tags' | 'isPinned'>): Promise<Note> {
    const response = await apiManager.post<Note>(`${API_BASE}/notes`, {
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      tags: note.tags,
      isPinned: note.isPinned,
    });
    return response.data;
  },

  async update(
    id: string,
    updates: Partial<Note> & { updatedAt?: number },
  ): Promise<Note> {
    const response = await apiManager.put<Note>(`${API_BASE}/notes/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/notes/${id}`);
  },

  async permanentDelete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/notes/${id}/permanent`);
  },

  async restore(id: string): Promise<Note> {
    const response = await apiManager.post<Note>(`${API_BASE}/notes/${id}/restore`);
    return response.data;
  },

  async search(query: string): Promise<Note[]> {
    const response = await apiManager.get<Note[]>(`${API_BASE}/notes/search`, {
      params: { q: query },
    });
    return response.data;
  },

  async searchList(query: string): Promise<NoteListItem[]> {
    const response = await apiManager.get<NoteListItem[]>(`${API_BASE}/notes/list/search`, {
      params: { q: query },
    });
    return response.data;
  },

  async reorderNotes(noteOrders: { id: string; order: number }[]): Promise<void> {
    await apiManager.post(`${API_BASE}/notes/reorder`, { items: noteOrders });
  },
};

// Folder operations via API
export const foldersApi = {
  async getAll(): Promise<Folder[]> {
    const response = await apiManager.get<Folder[]>(`${API_BASE}/folders`);
    return response.data;
  },

  async getById(id: string): Promise<Folder> {
    const response = await apiManager.get<Folder>(`${API_BASE}/folders/${id}`);
    return response.data;
  },

  async create(folder: Pick<Folder, 'name' | 'parentId' | 'color'>): Promise<Folder> {
    const response = await apiManager.post<Folder>(`${API_BASE}/folders`, {
      name: folder.name,
      parentId: folder.parentId,
      color: folder.color,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Folder>): Promise<Folder> {
    const response = await apiManager.put<Folder>(`${API_BASE}/folders/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/folders/${id}`);
  },

  async reorder(folderOrders: { id: string; order: number }[]): Promise<Folder[]> {
    await apiManager.post(`${API_BASE}/folders/reorder`, { items: folderOrders });
    const response = await apiManager.get<Folder[]>(`${API_BASE}/folders`);
    return response.data;
  },
};

// Tag operations via API
export const tagsApi = {
  async getAll(): Promise<Tag[]> {
    const response = await apiManager.get<Tag[]>(`${API_BASE}/tags`);
    return response.data;
  },

  async getById(id: string): Promise<Tag> {
    const response = await apiManager.get<Tag>(`${API_BASE}/tags/${id}`);
    return response.data;
  },

  async create(tag: Pick<Tag, 'name' | 'color'>): Promise<Tag> {
    const response = await apiManager.post<Tag>(`${API_BASE}/tags`, {
      name: tag.name,
      color: tag.color,
    });
    return response.data;
  },

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    const response = await apiManager.put<Tag>(`${API_BASE}/tags/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/tags/${id}`);
  },
};
