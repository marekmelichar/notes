// API-first mode: Use REST API instead of local IndexedDB
// To switch back to local storage, change USE_API to false
const USE_API = true;

import Dexie, { type EntityTable } from "dexie";
import type { Note, Folder, Tag, SyncQueueItem } from "../types";
import { notesApi, foldersApi, tagsApi } from "./notesApi";

class NotesDatabase extends Dexie {
  notes!: EntityTable<Note, "id">;
  folders!: EntityTable<Folder, "id">;
  tags!: EntityTable<Tag, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("NotesDB");

    this.version(1).stores({
      notes: "id, folderId, isPinned, isDeleted, createdAt, updatedAt, *tags",
      folders: "id, parentId, order",
      tags: "id, name",
      syncQueue: "id, type, action, entityId, createdAt",
    });

    // Version 2: Add order field to notes
    this.version(2)
      .stores({
        notes:
          "id, folderId, isPinned, isDeleted, createdAt, updatedAt, order, *tags",
        folders: "id, parentId, order",
        tags: "id, name",
        syncQueue: "id, type, action, entityId, createdAt",
      })
      .upgrade((tx) => {
        // Add order field to existing notes based on createdAt
        return tx
          .table("notes")
          .toCollection()
          .modify((note, ref) => {
            ref.value.order = note.order ?? note.createdAt;
          });
      });
  }
}

export const db = new NotesDatabase();

// Re-export API services when USE_API is true
export { notesApi, foldersApi, tagsApi };

// Note operations
export const notesDb = {
  async getAll(): Promise<Note[]> {
    return db.notes.toArray();
  },

  async getById(id: string): Promise<Note | undefined> {
    return db.notes.get(id);
  },

  async getByFolder(folderId: string | null): Promise<Note[]> {
    if (folderId === null) {
      return db.notes.where("folderId").equals("").toArray();
    }
    return db.notes.where("folderId").equals(folderId).toArray();
  },

  async create(note: Note): Promise<string> {
    await db.notes.add(note);
    await addToSyncQueue("note", "create", note.id, note);
    return note.id;
  },

  async update(id: string, updates: Partial<Note>): Promise<void> {
    const updatedData = { ...updates, updatedAt: Date.now() };
    await db.notes.update(id, updatedData);
    const note = await db.notes.get(id);
    if (note) {
      await addToSyncQueue("note", "update", id, note);
    }
  },

  async delete(id: string): Promise<void> {
    // Soft delete
    await db.notes.update(id, { isDeleted: true, updatedAt: Date.now() });
    await addToSyncQueue("note", "delete", id, { id });
  },

  async permanentDelete(id: string): Promise<void> {
    await db.notes.delete(id);
  },

  async restore(id: string): Promise<void> {
    await db.notes.update(id, { isDeleted: false, updatedAt: Date.now() });
    const note = await db.notes.get(id);
    if (note) {
      await addToSyncQueue("note", "update", id, note);
    }
  },

  async search(query: string): Promise<Note[]> {
    const lowerQuery = query.toLowerCase();
    return db.notes
      .filter(
        (note) =>
          !note.isDeleted &&
          (note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  },

  async reorderNotes(
    noteOrders: { id: string; order: number }[]
  ): Promise<void> {
    const now = Date.now();
    await db.transaction("rw", db.notes, async () => {
      for (const { id, order } of noteOrders) {
        await db.notes.update(id, { order, updatedAt: now });
      }
    });
    // Add to sync queue for each updated note
    for (const { id } of noteOrders) {
      const note = await db.notes.get(id);
      if (note) {
        await addToSyncQueue("note", "update", id, note);
      }
    }
  },

  async getMaxOrderInFolder(folderId: string | null): Promise<number> {
    const notes =
      folderId === null
        ? await db.notes.where("folderId").equals("").toArray()
        : await db.notes.where("folderId").equals(folderId).toArray();
    if (notes.length === 0) return 0;
    return Math.max(...notes.map((n) => n.order ?? 0));
  },
};

// Folder operations
export const foldersDb = {
  async getAll(): Promise<Folder[]> {
    return db.folders.orderBy("order").toArray();
  },

  async getById(id: string): Promise<Folder | undefined> {
    return db.folders.get(id);
  },

  async getChildren(parentId: string | null): Promise<Folder[]> {
    if (parentId === null) {
      return db.folders.where("parentId").equals("").toArray();
    }
    return db.folders.where("parentId").equals(parentId).toArray();
  },

  async create(folder: Folder): Promise<string> {
    await db.folders.add(folder);
    await addToSyncQueue("folder", "create", folder.id, folder);
    return folder.id;
  },

  async update(id: string, updates: Partial<Folder>): Promise<void> {
    const updatedData = { ...updates, updatedAt: Date.now() };
    await db.folders.update(id, updatedData);
    const folder = await db.folders.get(id);
    if (folder) {
      await addToSyncQueue("folder", "update", id, folder);
    }
  },

  async delete(id: string): Promise<void> {
    // Move notes in this folder to root
    await db.notes.where("folderId").equals(id).modify({ folderId: null });
    // Delete the folder
    await db.folders.delete(id);
    await addToSyncQueue("folder", "delete", id, { id });
  },
};

// Tag operations
export const tagsDb = {
  async getAll(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async create(tag: Tag): Promise<string> {
    await db.tags.add(tag);
    await addToSyncQueue("tag", "create", tag.id, tag);
    return tag.id;
  },

  async update(id: string, updates: Partial<Tag>): Promise<void> {
    await db.tags.update(id, updates);
    const tag = await db.tags.get(id);
    if (tag) {
      await addToSyncQueue("tag", "update", id, tag);
    }
  },

  async delete(id: string): Promise<void> {
    // Remove tag from all notes
    const notesWithTag = await db.notes.where("tags").equals(id).toArray();
    for (const note of notesWithTag) {
      await db.notes.update(note.id, {
        tags: note.tags.filter((t) => t !== id),
      });
    }
    await db.tags.delete(id);
    await addToSyncQueue("tag", "delete", id, { id });
  },
};

// Sync queue operations
async function addToSyncQueue(
  type: SyncQueueItem["type"],
  action: SyncQueueItem["action"],
  entityId: string,
  data: unknown
): Promise<void> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    type,
    action,
    entityId,
    data,
    createdAt: Date.now(),
    retries: 0,
  };
  await db.syncQueue.add(item);
}

export const syncQueueDb = {
  async getAll(): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy("createdAt").toArray();
  },

  async remove(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async incrementRetries(id: string): Promise<void> {
    await db.syncQueue.update(id, {
      retries: (await db.syncQueue.get(id))?.retries ?? 0 + 1,
    });
  },

  async clear(): Promise<void> {
    await db.syncQueue.clear();
  },

  async count(): Promise<number> {
    return db.syncQueue.count();
  },
};
