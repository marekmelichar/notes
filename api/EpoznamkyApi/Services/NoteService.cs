using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

/// <summary>
/// Thrown by NoteService when an UpdateNote request fails an optimistic concurrency
/// or sanity check. The controller maps this to HTTP 409 Conflict + ProblemDetails.
/// </summary>
public class NoteConflictException(string detail) : Exception(detail);

public partial class NoteService(AppDbContext db, FileService fileService, ILogger<NoteService> logger)
{
    // Suspicious-shrink sanity guard: if a client tries to replace content > this
    // many bytes with content < this many bytes, we reject the write as 409. This
    // is a belt-and-braces defense against a stale editor autosaving over a
    // much-larger server-side doc (see 2026-04-23 incident where a 36 KB note
    // was wiped by a ghost-tab autosave of an empty TipTap doc).
    private const int SuspiciousShrinkNewMaxBytes = 64;
    private const int SuspiciousShrinkExistingMinBytes = 256;

    public async Task<PaginatedResponse<NoteResponse>> GetNotesAsync(string userId, int limit = 100, int offset = 0)
    {
        var query = db.Notes
            .Where(n => n.UserId == userId)
            .OrderBy(n => n.Order);

        var totalCount = await query.CountAsync();

        var paginated = limit > 0 ? query.Skip(offset).Take(limit) : query.Skip(offset);
        var notes = await paginated.ToListAsync();

        await PopulateNoteRelationsAsync(notes);

        return new PaginatedResponse<NoteResponse>
        {
            Items = notes.Select(ToResponse).ToList(),
            TotalCount = totalCount,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<PaginatedResponse<NoteListResponse>> GetNoteListAsync(
        string userId,
        int limit = 100,
        int offset = 0,
        string? folderId = null,
        List<string>? tagIds = null,
        bool? isPinned = null,
        bool? isDeleted = null,
        string sortBy = "updatedAt",
        string sortOrder = "desc")
    {
        var query = db.Notes.Where(n => n.UserId == userId);

        // Apply filters
        if (isDeleted.HasValue)
            query = query.Where(n => n.IsDeleted == isDeleted.Value);

        if (folderId != null)
            query = query.Where(n => n.FolderId == folderId);

        if (isPinned.HasValue)
            query = query.Where(n => n.IsPinned == isPinned.Value);

        if (tagIds is { Count: > 0 })
        {
            var noteIdsWithTags = db.NoteTags
                .Where(nt => tagIds.Contains(nt.TagId))
                .Select(nt => nt.NoteId)
                .Distinct();
            query = query.Where(n => noteIdsWithTags.Contains(n.Id));
        }

        var totalCount = await query.CountAsync();

        // Apply sorting: pinned first, then user-selected sort
        IOrderedQueryable<Note> ordered = sortBy.ToLowerInvariant() switch
        {
            "createdat" => sortOrder == "asc"
                ? query.OrderByDescending(n => n.IsPinned).ThenBy(n => n.CreatedAt)
                : query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt),
            "title" => sortOrder == "asc"
                ? query.OrderByDescending(n => n.IsPinned).ThenBy(n => n.Title)
                : query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.Title),
            _ => sortOrder == "asc"
                ? query.OrderByDescending(n => n.IsPinned).ThenBy(n => n.UpdatedAt)
                : query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.UpdatedAt),
        };

        var paginated = limit > 0 ? ordered.Skip(offset).Take(limit) : ordered.Skip(offset);
        var notes = await paginated.ToListAsync();

        await PopulateNoteRelationsAsync(notes);

        return new PaginatedResponse<NoteListResponse>
        {
            Items = notes.Select(ToListResponse).ToList(),
            TotalCount = totalCount,
            Limit = limit,
            Offset = offset
        };
    }

    public async Task<List<NoteListResponse>> SearchNotesListAsync(string userId, string query)
        => (await SearchNotesInternalAsync(userId, query)).Select(ToListResponse).ToList();

    public async Task<NoteResponse?> GetNoteAsync(string id, string userId)
    {
        var note = await db.Notes
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (note == null) return null;

        await PopulateNoteRelationsAsync([note]);
        return ToResponse(note);
    }

    public async Task<List<NoteResponse>> SearchNotesAsync(string userId, string query)
        => (await SearchNotesInternalAsync(userId, query)).Select(ToResponse).ToList();

    public async Task<NoteResponse> CreateNoteAsync(CreateNoteRequest request, string userId)
    {
        var folderId = string.IsNullOrWhiteSpace(request.FolderId) ? null : request.FolderId;
        var tagIds = request.Tags.Distinct().ToList();
        await ValidateNoteRelationsAsync(userId, folderId, tagIds);

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var order = await GetNextOrderAsync(userId, folderId);
        var note = new Note
        {
            Title = request.Title,
            Content = request.Content,
            FolderId = folderId,
            IsPinned = request.IsPinned,
            Order = order,
            CreatedAt = now,
            UpdatedAt = now,
            UserId = userId
        };

        db.Notes.Add(note);

        foreach (var tagId in tagIds)
        {
            db.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tagId });
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Note {NoteId} created for user {UserId}", note.Id, userId);

        note.Tags = tagIds;
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

        // Content-mutating updates must carry the client's observed UpdatedAt so
        // we can reject stale writes (see ADR 0009). Metadata-only updates
        // (pin/folder/tags/order) don't require the token to preserve the
        // existing partial-update semantics.
        if (request.Content != null)
        {
            if (!request.UpdatedAt.HasValue)
            {
                // Missing token = malformed request (400). This is a contract
                // requirement for content updates, not a concurrency state
                // issue, so it surfaces separately from the 409 case.
                throw new InvalidOperationException(
                    "Missing UpdatedAt token for a content update. Reload the note and retry.");
            }
            if (request.UpdatedAt.Value != note.UpdatedAt)
            {
                logger.LogWarning(
                    "Concurrency conflict on Note {NoteId} for user {UserId}: client UpdatedAt {ClientUpdatedAt} != server UpdatedAt {ServerUpdatedAt}",
                    id, userId, request.UpdatedAt.Value, note.UpdatedAt);
                throw new NoteConflictException(
                    "This note was changed elsewhere. Reload to see the newer version.");
            }

            var newByteCount = System.Text.Encoding.UTF8.GetByteCount(request.Content);
            var existingByteCount = System.Text.Encoding.UTF8.GetByteCount(note.Content);
            if (newByteCount < SuspiciousShrinkNewMaxBytes && existingByteCount > SuspiciousShrinkExistingMinBytes)
            {
                logger.LogWarning(
                    "Suspicious-shrink rejected on Note {NoteId} for user {UserId}: {NewBytes}B would replace {ExistingBytes}B",
                    id, userId, newByteCount, existingByteCount);
                throw new NoteConflictException(
                    "Refusing to replace a non-empty note with a near-empty one. Reload and retry if this was intended.");
            }
        }

        var folderId = request.FolderId == null
            ? null
            : string.IsNullOrWhiteSpace(request.FolderId)
                ? string.Empty
                : request.FolderId;
        var tagIds = request.Tags?.Distinct().ToList();
        await ValidateNoteRelationsAsync(userId, folderId, tagIds);

        var targetFolderId = folderId == null
            ? note.FolderId
            : folderId == string.Empty
                ? null
                : folderId;
        var folderChanged = folderId != null && targetFolderId != note.FolderId;

        if (request.Title != null) note.Title = request.Title;

        // Diff file references so we can clean up files removed from the note content.
        // Done before assigning the new content so we keep the old snapshot.
        List<string> removedStoredFilenames = [];
        if (request.Content != null && request.Content != note.Content)
        {
            var oldIds = FileService.ExtractReferencedFileIds(note.Content);
            var newIds = FileService.ExtractReferencedFileIds(request.Content);
            oldIds.ExceptWith(newIds);
            if (oldIds.Count > 0)
            {
                removedStoredFilenames = await fileService.DeleteFileUploadsByIdsAsync(oldIds, userId, note.Id);
            }
            note.Content = request.Content;
        }

        if (folderId != null)
        {
            note.FolderId = targetFolderId;
        }
        if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
        if (folderChanged && !request.Order.HasValue)
        {
            note.Order = await GetNextOrderAsync(userId, targetFolderId);
        }
        if (request.Order.HasValue) note.Order = request.Order.Value;

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

        // Best-effort disk cleanup for files removed from the note content
        foreach (var storedFilename in removedStoredFilenames)
        {
            fileService.DeleteFile(storedFilename);
        }

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

        foreach (var note in notes)
        {
            note.Tags = noteTags.Where(nt => nt.NoteId == note.Id).Select(nt => nt.TagId).ToList();
        }
    }

    private async Task<int> GetNextOrderAsync(string userId, string? folderId)
    {
        var maxOrder = await db.Notes
            .Where(n => n.UserId == userId && n.FolderId == folderId && !n.IsDeleted)
            .MaxAsync(n => (int?)n.Order);

        return (maxOrder ?? -1) + 1;
    }

    private async Task ValidateNoteRelationsAsync(string userId, string? folderId, List<string>? tagIds)
    {
        if (!string.IsNullOrEmpty(folderId))
        {
            var folderExists = await db.Folders.AnyAsync(f => f.Id == folderId && f.UserId == userId);
            if (!folderExists)
                throw new InvalidOperationException("Selected folder does not exist.");
        }

        if (tagIds is { Count: > 0 })
        {
            var uniqueTagIds = tagIds.Distinct().ToList();
            var ownedTagCount = await db.Tags.CountAsync(t => t.UserId == userId && uniqueTagIds.Contains(t.Id));
            if (ownedTagCount != uniqueTagIds.Count)
                throw new InvalidOperationException("One or more selected tags do not exist.");
        }
    }

    private async Task<List<Note>> SearchNotesInternalAsync(string userId, string query)
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
            .Where(n => n.UserId == userId &&
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
        Order = note.Order,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
        SyncedAt = note.SyncedAt
    };

    private static NoteListResponse ToListResponse(Note note) => new()
    {
        Id = note.Id,
        Title = note.Title,
        FolderId = note.FolderId,
        Tags = note.Tags,
        IsPinned = note.IsPinned,
        IsDeleted = note.IsDeleted,
        DeletedAt = note.DeletedAt,
        Order = note.Order,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt,
    };
}
