using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public partial class NoteService(AppDbContext db, ILogger<NoteService> logger)
{
    public async Task<PaginatedResponse<NoteResponse>> GetNotesAsync(string userId, string userEmail, int limit = 100, int offset = 0)
    {
        var query = db.Notes
            .Where(n => n.UserId == userId ||
                        db.NoteShares.Any(s => s.NoteId == n.Id &&
                            (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail)))
            .OrderBy(n => n.Order);

        var totalCount = await query.CountAsync();

        var notes = await query
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);

        return new PaginatedResponse<NoteResponse>
        {
            Items = notes.Select(ToResponse).ToList(),
            TotalCount = totalCount,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<NoteResponse?> GetNoteAsync(string id, string userId, string userEmail)
    {
        var note = await db.Notes
            .FirstOrDefaultAsync(n => n.Id == id &&
                (n.UserId == userId ||
                 db.NoteShares.Any(s => s.NoteId == n.Id &&
                     (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail))));

        if (note == null) return null;

        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
    }

    public async Task<List<NoteResponse>> SearchNotesAsync(string userId, string userEmail, string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return [];

        var normalized = RemoveDiacritics(query);
        var sanitized = SearchSanitizeRegex().Replace(normalized, "");
        if (string.IsNullOrWhiteSpace(sanitized))
            return [];

        var terms = sanitized.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var prefixQuery = string.Join(" & ", terms.Select(t => t + ":*"));

        var notes = await db.Notes
            .Where(n => (n.UserId == userId ||
                         db.NoteShares.Any(s => s.NoteId == n.Id &&
                             (s.SharedWithUserId == userId || s.SharedWithEmail == userEmail))) &&
                       !n.IsDeleted &&
                       n.SearchVector!.Matches(EF.Functions.ToTsQuery("simple", prefixQuery)))
            .OrderByDescending(n => n.SearchVector!.Rank(EF.Functions.ToTsQuery("simple", prefixQuery)))
            .ToListAsync();

        await PopulateNoteRelationsAsync(notes);
        return notes.Select(ToResponse).ToList();
    }

    public async Task<NoteResponse> CreateNoteAsync(CreateNoteRequest request, string userId)
    {
        var note = new Note
        {
            Title = request.Title,
            Content = request.Content,
            FolderId = request.FolderId,
            IsPinned = request.IsPinned,
            UserId = userId
        };

        db.Notes.Add(note);

        foreach (var tagId in request.Tags)
        {
            db.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tagId });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Note {NoteId} created for user {UserId}", note.Id, userId);

        note.Tags = request.Tags;
        return ToResponse(note);
    }

    public async Task<NoteResponse?> UpdateNoteAsync(string id, string userId, UpdateNoteRequest request)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during update", id, userId);
            return null;
        }

        if (request.Title != null) note.Title = request.Title;
        if (request.Content != null) note.Content = request.Content;
        if (request.FolderId != null)
        {
            note.FolderId = request.FolderId == "" ? null : request.FolderId;
        }
        if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
        if (request.Order.HasValue) note.Order = request.Order.Value;

        note.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (request.Tags != null)
        {
            var existingTags = await db.NoteTags.Where(nt => nt.NoteId == id).ToListAsync();
            db.NoteTags.RemoveRange(existingTags);

            foreach (var tagId in request.Tags)
            {
                db.NoteTags.Add(new NoteTag { NoteId = id, TagId = tagId });
            }
        }

        await db.SaveChangesAsync();
        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
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

    public async Task<NoteResponse?> SoftDeleteNoteAsync(string id, string userId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null) return null;

        note.IsDeleted = true;
        note.DeletedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        note.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await db.SaveChangesAsync();
        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
    }

    public async Task<NoteResponse?> RestoreNoteAsync(string id, string userId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (note == null) return null;

        note.IsDeleted = false;
        note.DeletedAt = null;
        note.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await db.SaveChangesAsync();
        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
    }

    public async Task ReorderNotesAsync(string userId, List<NoteOrderItem> items)
    {
        var noteIds = items.Select(i => i.Id).ToList();
        var notes = await db.Notes
            .Where(n => noteIds.Contains(n.Id) && n.UserId == userId)
            .ToListAsync();

        var orderMap = items.ToDictionary(i => i.Id, i => i.Order);
        foreach (var note in notes)
        {
            if (orderMap.TryGetValue(note.Id, out var order))
                note.Order = order;
        }

        await db.SaveChangesAsync();
    }

    public async Task<NoteResponse?> ShareNoteAsync(string noteId, string userId, string email, string permission)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during share", noteId, userId);
            return null;
        }

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
        return ToResponse(note);
    }

    public async Task<NoteResponse?> RemoveShareAsync(string noteId, string userId, string sharedUserId)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId);
        if (note == null)
        {
            logger.LogDebug("Note {NoteId} not found for user {UserId} during share removal", noteId, userId);
            return null;
        }

        var share = await db.NoteShares.FirstOrDefaultAsync(s =>
            s.NoteId == noteId && (s.SharedWithUserId == sharedUserId || s.SharedWithEmail == sharedUserId));
        if (share != null)
        {
            db.NoteShares.Remove(share);
            await db.SaveChangesAsync();
            logger.LogInformation("Share removed from note {NoteId} by user {UserId}", noteId, userId);
        }

        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
    }

    public async Task<List<string>> GetStoredFilesForExpiredTrashAsync(int retentionDays = 30)
    {
        var cutoffTime = DateTimeOffset.UtcNow.AddDays(-retentionDays).ToUnixTimeMilliseconds();

        var expiredNoteIds = db.Notes
            .Where(n => n.IsDeleted && n.DeletedAt.HasValue && n.DeletedAt.Value < cutoffTime)
            .Select(n => n.Id);

        return await db.FileUploads
            .Where(f => f.NoteId != null && expiredNoteIds.Contains(f.NoteId))
            .Select(f => f.StoredFilename)
            .ToListAsync();
    }

    public async Task<int> CleanupOldTrashAsync(int retentionDays = 30)
    {
        var cutoffTime = DateTimeOffset.UtcNow.AddDays(-retentionDays).ToUnixTimeMilliseconds();

        var expiredNoteIds = db.Notes
            .Where(n => n.IsDeleted && n.DeletedAt.HasValue && n.DeletedAt.Value < cutoffTime)
            .Select(n => n.Id);

        await db.FileUploads
            .Where(f => f.NoteId != null && expiredNoteIds.Contains(f.NoteId))
            .ExecuteDeleteAsync();

        var deletedCount = await db.Notes
            .Where(n => n.IsDeleted && n.DeletedAt.HasValue && n.DeletedAt.Value < cutoffTime)
            .ExecuteDeleteAsync();

        return deletedCount;
    }

    /// <summary>
    /// Returns stored filenames for all files associated with a note (for disk cleanup).
    /// </summary>
    public async Task<List<string>> GetFileStoredNamesForNoteAsync(string noteId) =>
        await db.FileUploads
            .Where(f => f.NoteId == noteId)
            .Select(f => f.StoredFilename)
            .ToListAsync();

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

    private static NoteResponse ToResponse(Note note) => new()
    {
        Id = note.Id,
        Title = note.Title,
        Content = note.Content,
        FolderId = note.FolderId,
        Tags = note.Tags,
        IsPinned = note.IsPinned,
        IsDeleted = note.IsDeleted,
        DeletedAt = note.DeletedAt,
        SharedWith = note.SharedWith,
        Order = note.Order,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        SyncedAt = note.SyncedAt
    };
}
