using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public class DataService(AppDbContext db)
{
    // Notes
    public async Task<List<Note>> GetNotesAsync(string userId)
    {
        var notes = await db.Notes
            .Where(n => n.UserId == userId || db.NoteShares.Any(s => s.NoteId == n.Id && s.SharedWithUserId == userId))
            .OrderBy(n => n.Order)
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);
        return notes;
    }

    public async Task<Note?> GetNoteAsync(string id, string userId)
    {
        var note = await db.Notes
            .FirstOrDefaultAsync(n => n.Id == id &&
                (n.UserId == userId || db.NoteShares.Any(s => s.NoteId == n.Id && s.SharedWithUserId == userId)));

        if (note != null)
            await PopulateNoteRelationsAsync([note]);

        return note;
    }

    public async Task<List<Note>> SearchNotesAsync(string userId, string query)
    {
        var notes = await db.Notes
            .Where(n => (n.UserId == userId || db.NoteShares.Any(s => s.NoteId == n.Id && s.SharedWithUserId == userId)) &&
                       !n.IsDeleted &&
                       (EF.Functions.ILike(n.Title, $"%{query}%") ||
                        EF.Functions.ILike(n.Content, $"%{query}%")))
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);
        return notes;
    }

    public async Task<Note> CreateNoteAsync(Note note, List<string> tagIds)
    {
        db.Notes.Add(note);

        foreach (var tagId in tagIds)
        {
            db.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tagId });
        }

        await db.SaveChangesAsync();
        note.Tags = tagIds;
        return note;
    }

    public async Task<Note?> UpdateNoteAsync(string id, string userId, Action<Note> update, List<string>? tagIds = null)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null) return null;

        update(note);
        note.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (tagIds != null)
        {
            var existingTags = await db.NoteTags.Where(nt => nt.NoteId == id).ToListAsync();
            db.NoteTags.RemoveRange(existingTags);

            foreach (var tagId in tagIds)
            {
                db.NoteTags.Add(new NoteTag { NoteId = id, TagId = tagId });
            }
        }

        await db.SaveChangesAsync();
        await PopulateNoteRelationsAsync([note]);
        return note;
    }

    public async Task<bool> DeleteNoteAsync(string id, string userId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null) return false;

        db.Notes.Remove(note);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<Note?> ShareNoteAsync(string noteId, string userId, string email, string permission)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null) return null;

        var existingShare = await db.NoteShares.FirstOrDefaultAsync(s => s.NoteId == noteId && s.SharedWithEmail == email);
        if (existingShare != null)
        {
            existingShare.Permission = permission;
        }
        else
        {
            db.NoteShares.Add(new NoteShare
            {
                NoteId = noteId,
                SharedWithUserId = email,
                SharedWithEmail = email,
                Permission = permission
            });
        }

        await db.SaveChangesAsync();
        await PopulateNoteRelationsAsync([note]);
        return note;
    }

    public async Task<Note?> RemoveShareAsync(string noteId, string userId, string sharedUserId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null) return null;

        var share = await db.NoteShares.FirstOrDefaultAsync(s => s.NoteId == noteId && s.SharedWithUserId == sharedUserId);
        if (share != null)
        {
            db.NoteShares.Remove(share);
            await db.SaveChangesAsync();
        }

        await PopulateNoteRelationsAsync([note]);
        return note;
    }

    private async Task PopulateNoteRelationsAsync(List<Note> notes)
    {
        if (notes.Count == 0) return;

        var noteIds = notes.Select(n => n.Id).ToList();

        var noteTags = await db.NoteTags
            .Where(nt => noteIds.Contains(nt.NoteId))
            .ToListAsync();

        var noteShares = await db.NoteShares
            .Where(ns => noteIds.Contains(ns.NoteId))
            .ToListAsync();

        foreach (var note in notes)
        {
            note.Tags = noteTags.Where(nt => nt.NoteId == note.Id).Select(nt => nt.TagId).ToList();
            note.SharedWith = noteShares
                .Where(ns => ns.NoteId == note.Id)
                .Select(ns => new SharedUser
                {
                    UserId = ns.SharedWithUserId,
                    Email = ns.SharedWithEmail,
                    Permission = ns.Permission
                })
                .ToList();
        }
    }

    // Folders
    public async Task<List<Folder>> GetFoldersAsync(string userId) =>
        await db.Folders.Where(f => f.UserId == userId).OrderBy(f => f.Order).ToListAsync();

    public async Task<Folder?> GetFolderAsync(string id, string userId) =>
        await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);

    public async Task<Folder> CreateFolderAsync(Folder folder)
    {
        db.Folders.Add(folder);
        await db.SaveChangesAsync();
        return folder;
    }

    public async Task<Folder?> UpdateFolderAsync(string id, string userId, Action<Folder> update)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder == null) return null;

        update(folder);
        folder.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return folder;
    }

    public async Task<bool> DeleteFolderAsync(string id, string userId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder == null) return false;

        // Clear folderId from notes in this folder
        var notesInFolder = await db.Notes.Where(n => n.FolderId == id).ToListAsync();
        foreach (var note in notesInFolder)
        {
            note.FolderId = null;
        }

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        return true;
    }

    // Tags
    public async Task<List<Tag>> GetTagsAsync(string userId) =>
        await db.Tags.Where(t => t.UserId == userId).ToListAsync();

    public async Task<Tag?> GetTagAsync(string id, string userId) =>
        await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

    public async Task<Tag> CreateTagAsync(Tag tag)
    {
        db.Tags.Add(tag);
        await db.SaveChangesAsync();
        return tag;
    }

    public async Task<Tag?> UpdateTagAsync(string id, string userId, Action<Tag> update)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag == null) return null;

        update(tag);
        tag.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return tag;
    }

    public async Task<bool> DeleteTagAsync(string id, string userId)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag == null) return false;

        db.Tags.Remove(tag);
        await db.SaveChangesAsync();
        return true;
    }

    // Users
    public async Task<User?> GetUserAsync(string id) =>
        await db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public async Task<List<User>> SearchUsersAsync(string email) =>
        await db.Users.Where(u => EF.Functions.ILike(u.Email, $"%{email}%")).ToListAsync();

    public async Task<User> CreateOrUpdateUserAsync(User user)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
        if (existing != null)
        {
            existing.Email = user.Email;
            existing.Name = user.Name;
        }
        else
        {
            db.Users.Add(user);
        }
        await db.SaveChangesAsync();
        return existing ?? user;
    }
}
