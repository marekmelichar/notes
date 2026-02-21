using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public class TagService(AppDbContext db, ILogger<TagService> logger)
{
    public async Task<List<TagResponse>> GetTagsAsync(string userId)
    {
        var tags = await db.Tags
            .Where(t => t.UserId == userId)
            .ToListAsync();

        return tags.Select(ToResponse).ToList();
    }

    public async Task<TagResponse?> GetTagAsync(string id, string userId)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        return tag == null ? null : ToResponse(tag);
    }

    public async Task<TagResponse> CreateTagAsync(CreateTagRequest request, string userId)
    {
        var tag = new Tag
        {
            Name = request.Name,
            Color = request.Color,
            UserId = userId
        };

        db.Tags.Add(tag);
        await db.SaveChangesAsync();
        logger.LogInformation("Tag {TagId} created for user {UserId}", tag.Id, userId);
        return ToResponse(tag);
    }

    public async Task<TagResponse?> UpdateTagAsync(string id, string userId, UpdateTagRequest request)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (tag == null)
        {
            logger.LogDebug("Tag {TagId} not found for user {UserId} during update", id, userId);
            return null;
        }

        if (request.Name != null) tag.Name = request.Name;
        if (request.Color != null) tag.Color = request.Color;

        tag.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await db.SaveChangesAsync();
        return ToResponse(tag);
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

    private static TagResponse ToResponse(Tag tag) => new()
    {
        Id = tag.Id,
        Name = tag.Name,
        Color = tag.Color
    };
}
