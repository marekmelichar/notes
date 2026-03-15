import { apiManager } from '@/lib';
import type { Note, Folder, Tag } from '../types';

const API_BASE = '/api/v1';

// Note operations via API
export const notesApi = {
  async getAll(): Promise<Note[]> {
    const response = await apiManager.get<{ items: Note[]; totalCount: number }>(
      `${API_BASE}/notes`,
      { params: { limit: 0 } },
    );
    return response.data.items;
  },

  async getById(id: string): Promise<Note> {
    const response = await apiManager.get<Note>(`${API_BASE}/notes/${id}`);
    return response.data;
  },

  async create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    const response = await apiManager.post<Note>(`${API_BASE}/notes`, {
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      tags: note.tags,
      isPinned: note.isPinned,
    });
    return response.data.id;
  },

  async update(id: string, updates: Partial<Note>): Promise<Note> {
    const response = await apiManager.put<Note>(`${API_BASE}/notes/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/notes/${id}`);
  },

  async permanentDelete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/notes/${id}/permanent`);
  },

  async restore(id: string): Promise<void> {
    await apiManager.post(`${API_BASE}/notes/${id}/restore`);
  },

  async search(query: string): Promise<Note[]> {
    const response = await apiManager.get<Note[]>(`${API_BASE}/notes/search`, {
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

  async create(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> {
    const response = await apiManager.post<Folder>(`${API_BASE}/folders`, {
      name: folder.name,
      parentId: folder.parentId,
      color: folder.color,
    });
    return response.data.id;
  },

  async update(id: string, updates: Partial<Folder>): Promise<Folder> {
    const response = await apiManager.put<Folder>(`${API_BASE}/folders/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/folders/${id}`);
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

  async create(tag: Omit<Tag, 'id'>): Promise<string> {
    const response = await apiManager.post<Tag>(`${API_BASE}/tags`, {
      name: tag.name,
      color: tag.color,
    });
    return response.data.id;
  },

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    const response = await apiManager.put<Tag>(`${API_BASE}/tags/${id}`, updates);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiManager.delete(`${API_BASE}/tags/${id}`);
  },
};
