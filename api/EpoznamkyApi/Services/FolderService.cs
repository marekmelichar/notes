using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public class FolderService(AppDbContext db, ILogger<FolderService> logger)
{
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
        var folder = new Folder
        {
            Name = request.Name,
            ParentId = request.ParentId,
            Color = request.Color,
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

        if (request.Name != null) folder.Name = request.Name;
        if (request.ParentId != null) folder.ParentId = request.ParentId == "" ? null : request.ParentId;
        if (request.Color != null) folder.Color = request.Color;
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

    public async Task<bool> WouldCreateCircularReferenceAsync(string folderId, string parentId, string userId)
    {
        if (parentId == folderId) return true;

        var visited = new HashSet<string> { folderId };
        var currentParentId = parentId;

        while (!string.IsNullOrEmpty(currentParentId))
        {
            if (!visited.Add(currentParentId))
                return true;

            var parent = await db.Folders.FirstOrDefaultAsync(f => f.Id == currentParentId && f.UserId == userId);
            if (parent == null) break;
            currentParentId = parent.ParentId;
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
