using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public partial class DataService(AppDbContext db, ILogger<DataService> logger)
{
    // Notes
    public async Task<List<Note>> GetNotesAsync(string userId, string userEmail)
    {
        var notes = await db.Notes
            .Where(n => n.UserId == userId ||
                        db.NoteShares.Any(s => s.NoteId == n.Id &&
                            (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail)))
            .OrderBy(n => n.Order)
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);
        return notes;
    }

    public async Task<Note?> GetNoteAsync(string id, string userId, string userEmail)
    {
        var note = await db.Notes
            .FirstOrDefaultAsync(n => n.Id == id &&
                (n.UserId == userId ||
                 db.NoteShares.Any(s => s.NoteId == n.Id &&
                     (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail))));

        if (note != null)
            await PopulateNoteRelationsAsync([note]);

        return note;
    }

    public async Task<List<Note>> SearchNotesAsync(string userId, string userEmail, string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        // Strip diacritics so "Krsiak" matches "Kršiak" and vice versa
        // (SearchVector is also unaccented via unaccent_immutable in the generated column)
        var normalized = RemoveDiacritics(query);

        // Sanitize: keep only alphanumeric characters and spaces
        var sanitized = SearchSanitizeRegex().Replace(normalized, "");
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return [];
        }

        // Build prefix search query: "dai" -> "dai:*", "hello world" -> "hello:* & world:*"
        var terms = sanitized.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var prefixQuery = string.Join(" & ", terms.Select(t => t + ":*"));

        // Use PostgreSQL full-text search with prefix matching
        var notes = await db.Notes
            .Where(n => (n.UserId == userId ||
                         db.NoteShares.Any(s => s.NoteId == n.Id &&
                             (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail))) &&
                       !n.IsDeleted &&
                       n.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", prefixQuery)))
            .OrderByDescending(n => n.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", prefixQuery)))
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);
        return notes;
    }

    private static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    [GeneratedRegex(@"[^\w\s]")]
    private static partial Regex SearchSanitizeRegex();

    public async Task<Note> CreateNoteAsync(Note note, List<string> tagIds)
    {
        db.Notes.Add(note);

        foreach (var tagId in tagIds)
        {
            db.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tagId });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Note {NoteId} created for user {UserId}", note.Id, note.UserId);
        note.Tags = tagIds;
        return note;
    }

    public async Task<Note?> UpdateNoteAsync(string id, string userId, Action<Note> update, List<string>? tagIds = null)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during update", id, userId);
            return null;
        }

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
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during delete", id, userId);
            return false;
        }

        db.Notes.Remove(note);
        await db.SaveChangesAsync();
        logger.LogInformation("Note {NoteId} permanently deleted for user {UserId}", id, userId);
        return true;
    }

    public async Task<int> CleanupOldTrashAsync(int retentionDays = 30)
    {
        var cutoffTime = DateTimeOffset.UtcNow.AddDays(-retentionDays).ToUnixTimeMilliseconds();

        var notesToDelete = await db.Notes
            .Where(n => n.IsDeleted && n.DeletedAt.HasValue && n.DeletedAt.Value < cutoffTime)
            .ToListAsync();

        if (notesToDelete.Count == 0) return 0;

        // Remove related NoteTags and NoteShares
        var noteIds = notesToDelete.Select(n => n.Id).ToList();
        var tagsToRemove = await db.NoteTags.Where(nt => noteIds.Contains(nt.NoteId)).ToListAsync();
        var sharesToRemove = await db.NoteShares.Where(ns => noteIds.Contains(ns.NoteId)).ToListAsync();

        db.NoteTags.RemoveRange(tagsToRemove);
        db.NoteShares.RemoveRange(sharesToRemove);
        db.Notes.RemoveRange(notesToDelete);

        await db.SaveChangesAsync();
        return notesToDelete.Count;
    }

    public async Task<Note?> ShareNoteAsync(string noteId, string userId, string email, string permission)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during share", noteId, userId);
            return null;
        }

        // Resolve email to actual user ID when possible
        var targetUser = await db.Users.FirstOrDefaultAsync(u => EF.Functions.ILike(u.Email, email));
        var sharedWithUserId = targetUser?.Id ?? email;

        var existingShare = await db.NoteShares.FirstOrDefaultAsync(s => s.NoteId == noteId && s.SharedWithEmail == email);
        if (existingShare != null)
        {
            existingShare.Permission = permission;
            existingShare.SharedWithUserId = sharedWithUserId;
        }
        else
        {
            db.NoteShares.Add(new NoteShare
            {
                NoteId = noteId,
                SharedWithUserId = sharedWithUserId,
                SharedWithEmail = email,
                Permission = permission
            });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Note {NoteId} shared (permission: {Permission}) by user {UserId}", noteId, permission, userId);
        await PopulateNoteRelationsAsync([note]);
        return note;
    }

    public async Task<Note?> RemoveShareAsync(string noteId, string userId, string sharedUserId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during share removal", noteId, userId);
            return null;
        }

        // Match by ID or email (SharedWithUserId may contain either depending on data age)
        var share = await db.NoteShares.FirstOrDefaultAsync(s =>
            s.NoteId == noteId && (s.SharedWithUserId == sharedUserId || s.SharedWithEmail == sharedUserId));
        if (share != null)
        {
            db.NoteShares.Remove(share);
            await db.SaveChangesAsync();
            logger.LogInformation("Share removed from note {NoteId} by user {UserId}", noteId, userId);
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
        logger.LogInformation("Folder {FolderId} created for user {UserId}", folder.Id, folder.UserId);
        return folder;
    }

    public async Task<Folder?> UpdateFolderAsync(string id, string userId, Action<Folder> update)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder == null)
        {
            logger.LogDebug("Folder {FolderId} not found for user {UserId} during update", id, userId);
            return null;
        }

        update(folder);
        folder.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return folder;
    }

    public async Task<bool> DeleteFolderAsync(string id, string userId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder == null)
        {
            logger.LogDebug("Folder {FolderId} not found for user {UserId} during delete", id, userId);
            return false;
        }

        // Clear folderId from notes in this folder
        var notesInFolder = await db.Notes.Where(n => n.FolderId == id).ToListAsync();
        foreach (var note in notesInFolder)
        {
            note.FolderId = null;
        }

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        logger.LogInformation("Folder {FolderId} deleted for user {UserId}", id, userId);
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
        logger.LogInformation("Tag {TagId} created for user {UserId}", tag.Id, tag.UserId);
        return tag;
    }

    public async Task<Tag?> UpdateTagAsync(string id, string userId, Action<Tag> update)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag == null)
        {
            logger.LogDebug("Tag {TagId} not found for user {UserId} during update", id, userId);
            return null;
        }

        update(tag);
        tag.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return tag;
    }

    public async Task<bool> DeleteTagAsync(string id, string userId)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag == null)
        {
            logger.LogDebug("Tag {TagId} not found for user {UserId} during delete", id, userId);
            return false;
        }

        db.Tags.Remove(tag);
        await db.SaveChangesAsync();
        logger.LogInformation("Tag {TagId} deleted for user {UserId}", id, userId);
        return true;
    }

    // Users

    /// <summary>
    /// Get a user only if they share notes with the requesting user (prevents user enumeration).
    /// </summary>
    public async Task<User?> GetUserIfRelatedAsync(string id, string requestingUserId, string requestingUserEmail)
    {
        var targetUser = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (targetUser == null) return null;

        var isRelated = await db.NoteShares
            .AnyAsync(s =>
                // Target user has a share on requester's notes
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == requestingUserId) &&
                 (s.SharedWithUserId == id || s.SharedWithEmail == targetUser.Email)) ||
                // Requester has a share on target user's notes
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == id) &&
                 (s.SharedWithUserId == requestingUserId || s.SharedWithEmail == requestingUserEmail)));

        if (!isRelated) return null;
        return targetUser;
    }

    public async Task<List<User>> SearchUsersAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return [];

        return await db.Users.Where(u => EF.Functions.ILike(u.Email, $"%{email}%")).ToListAsync();
    }

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
