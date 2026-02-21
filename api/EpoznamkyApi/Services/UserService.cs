using EpoznamkyApi.Data;
using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

public class UserService(AppDbContext db)
{
    /// <summary>
    /// Get a user only if they share notes with the requesting user (prevents user enumeration).
    /// </summary>
    public async Task<User?> GetUserIfRelatedAsync(string id, string requestingUserId, string requestingUserEmail)
    {
        var targetUser = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (targetUser == null) return null;

        var isRelated = await db.NoteShares
            .AnyAsync(s =>
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == requestingUserId) &&
                 (s.SharedWithUserId == id || s.SharedWithEmail == targetUser.Email)) ||
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == id) &&
                 (s.SharedWithUserId == requestingUserId || s.SharedWithEmail == requestingUserEmail)));

        if (!isRelated) return null;
        return targetUser;
    }

    public async Task<List<User>> SearchUsersAsync(string email, string requestingUserId, string requestingUserEmail)
    {
        if (string.IsNullOrWhiteSpace(email))
            return [];

        return await db.Users
            .Where(u => EF.Functions.ILike(u.Email, $"%{email}%"))
            .Where(u => db.NoteShares.Any(s =>
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == requestingUserId) &&
                 (s.SharedWithUserId == u.Id || s.SharedWithEmail == u.Email)) ||
                (db.Notes.Any(n => n.Id == s.NoteId && n.UserId == u.Id) &&
                 (s.SharedWithUserId == requestingUserId || s.SharedWithEmail == requestingUserEmail))))
            .ToListAsync();
    }
}
