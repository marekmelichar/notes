using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public class FolderService(AppDbContext db, ILogger<FolderService> logger)
{
    private const int MaxFolderDepth = 5;

    public async Task<List<FolderResponse>> GetFoldersAsync(string userId)
    {
        var folders = await db.Folders
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.Order)
            .ToListAsync();

        return folders.Select(ToResponse).ToList();
    }

    public async Task<FolderResponse?> GetFolderAsync(string id, string userId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        return folder == null ? null : ToResponse(folder);
    }

    public async Task<FolderResponse> CreateFolderAsync(CreateFolderRequest request, string userId)
    {
        var parentId = string.IsNullOrWhiteSpace(request.ParentId) ? null : request.ParentId;
        await ValidateParentFolderAsync(userId, parentId);
        await ValidateFolderDepthAsync(parentId, userId);

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var order = await GetNextOrderAsync(userId, parentId);
        var folder = new Folder
        {
            Name = request.Name,
            ParentId = parentId,
            Color = request.Color,
            Order = order,
            CreatedAt = now,
            UpdatedAt = now,
            UserId = userId
        };

        db.Folders.Add(folder);
        await db.SaveChangesAsync();
        logger.LogInformation("Folder {FolderId} created for user {UserId}", folder.Id, userId);
        return ToResponse(folder);
    }

    public async Task<FolderResponse?> UpdateFolderAsync(string id, string userId, UpdateFolderRequest request)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        if (folder == null)
        {
            logger.LogDebug("Folder {FolderId} not found for user {UserId} during update", id, userId);
            return null;
        }

        var parentId = request.ParentId == null
            ? null
            : string.IsNullOrWhiteSpace(request.ParentId)
                ? string.Empty
                : request.ParentId;
        await ValidateParentFolderAsync(userId, parentId);

        var targetParentId = parentId == null
            ? folder.ParentId
            : parentId == string.Empty
                ? null
                : parentId;
        var parentChanged = parentId != null && targetParentId != folder.ParentId;

        if (parentChanged)
            await ValidateFolderDepthAsync(targetParentId, userId);

        if (request.Name != null) folder.Name = request.Name;
        if (parentId != null) folder.ParentId = targetParentId;
        if (request.Color != null) folder.Color = request.Color;
        if (parentChanged && !request.Order.HasValue)
        {
            folder.Order = await GetNextOrderAsync(userId, targetParentId);
        }
        if (request.Order.HasValue) folder.Order = request.Order.Value;

        folder.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return ToResponse(folder);
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
        var notesInFolder = await db.Notes.Where(n => n.FolderId == id && n.UserId == userId).ToListAsync();
        foreach (var note in notesInFolder)
        {
            note.FolderId = null;
        }

        db.Folders.Remove(folder);
        await db.SaveChangesAsync();
        logger.LogInformation("Folder {FolderId} deleted for user {UserId}", id, userId);
        return true;
    }

    public async Task<bool> WouldCreateCircularReferenceAsync(string folderId, string parentId, string userId)
    {
        if (parentId == folderId) return true;

        var parentChain = await LoadParentChainAsync(userId);
        var visited = new HashSet<string> { folderId };
        var currentParentId = parentId;

        while (!string.IsNullOrEmpty(currentParentId))
        {
            if (!visited.Add(currentParentId))
                return true;

            currentParentId = parentChain.GetValueOrDefault(currentParentId);
        }

        return false;
    }

    public async Task ReorderFoldersAsync(string userId, List<FolderOrderItem> items)
    {
        var folderIds = items.Select(i => i.Id).ToList();
        var folders = await db.Folders
            .Where(f => folderIds.Contains(f.Id) && f.UserId == userId)
            .ToListAsync();

        var orderMap = items.ToDictionary(i => i.Id, i => i.Order);
        foreach (var folder in folders)
        {
            if (orderMap.TryGetValue(folder.Id, out var order))
                folder.Order = order;
        }

        await db.SaveChangesAsync();
    }

    private async Task<int> GetNextOrderAsync(string userId, string? parentId)
    {
        var maxOrder = await db.Folders
            .Where(f => f.UserId == userId && f.ParentId == parentId)
            .MaxAsync(f => (int?)f.Order);

        return (maxOrder ?? -1) + 1;
    }

    private async Task ValidateFolderDepthAsync(string? parentId, string userId)
    {
        if (parentId == null) return;

        var parentChain = await LoadParentChainAsync(userId);
        var depth = 1;
        var currentId = parentId;

        while (currentId != null && parentChain.TryGetValue(currentId, out var nextParentId))
        {
            if (nextParentId == null) break;
            currentId = nextParentId;
            depth++;
        }

        if (depth >= MaxFolderDepth)
            throw new InvalidOperationException($"Maximum folder depth ({MaxFolderDepth}) exceeded.");
    }

    /// <summary>
    /// Loads all user folders as a dictionary of id → parentId in a single query.
    /// Used to walk the parent chain in memory instead of N+1 queries.
    /// </summary>
    private async Task<Dictionary<string, string?>> LoadParentChainAsync(string userId)
    {
        return await db.Folders
            .Where(f => f.UserId == userId)
            .ToDictionaryAsync(f => f.Id, f => f.ParentId);
    }

    private async Task ValidateParentFolderAsync(string userId, string? parentId)
    {
        if (string.IsNullOrEmpty(parentId))
            return;

        var parentExists = await db.Folders.AnyAsync(f => f.Id == parentId && f.UserId == userId);
        if (!parentExists)
            throw new InvalidOperationException("Selected parent folder does not exist.");
    }

    private static FolderResponse ToResponse(Folder folder) => new()
    {
        Id = folder.Id,
        Name = folder.Name,
        ParentId = folder.ParentId,
        Color = folder.Color,
        Order = folder.Order,
        CreatedAt = folder.CreatedAt,
        UpdatedAt = folder.UpdatedAt
    };
}
