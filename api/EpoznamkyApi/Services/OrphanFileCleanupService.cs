using EpoznamkyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Services;

/// <summary>
/// Background sweep that permanently deletes FileUpload rows (and their disk files)
/// when the file is older than the grace period AND no longer referenced by any of the
/// owning user's notes. Covers edge cases the on-save diff misses: abandoned uploads,
/// crashed saves, direct DB manipulation, etc.
/// </summary>
public class OrphanFileCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<OrphanFileCleanupService> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromHours(6);

    // Files younger than this are skipped — they may belong to a draft still being edited.
    private static readonly TimeSpan GracePeriod = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Orphan file cleanup service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during orphan file cleanup");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var fileService = scope.ServiceProvider.GetRequiredService<FileService>();

        var cutoff = DateTimeOffset.UtcNow.Subtract(GracePeriod).ToUnixTimeMilliseconds();

        // Candidate files = anything older than the grace period. Group by user so we
        // only load each user's notes once.
        var candidatesByUser = await db.FileUploads
            .Where(f => f.CreatedAt < cutoff)
            .GroupBy(f => f.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Files = g.Select(f => new { f.Id, f.StoredFilename }).ToList()
            })
            .ToListAsync(cancellationToken);

        var totalDeleted = 0;

        foreach (var group in candidatesByUser)
        {
            if (cancellationToken.IsCancellationRequested) break;

            // Union of all file IDs referenced in any of this user's notes
            var contents = await db.Notes
                .Where(n => n.UserId == group.UserId)
                .Select(n => n.Content)
                .ToListAsync(cancellationToken);

            var referenced = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var content in contents)
            {
                referenced.UnionWith(FileService.ExtractReferencedFileIds(content));
            }

            var orphanIds = group.Files
                .Where(f => !referenced.Contains(f.Id))
                .ToList();

            if (orphanIds.Count == 0) continue;

            var ids = orphanIds.Select(f => f.Id).ToList();
            await db.FileUploads
                .Where(f => ids.Contains(f.Id))
                .ExecuteDeleteAsync(cancellationToken);

            foreach (var f in orphanIds)
            {
                fileService.DeleteFile(f.StoredFilename);
            }

            totalDeleted += orphanIds.Count;
            logger.LogInformation("Removed {Count} orphan files for user {UserId}", orphanIds.Count, group.UserId);
        }

        if (totalDeleted > 0)
        {
            logger.LogInformation("Orphan file sweep: deleted {Count} files", totalDeleted);
        }
    }
}
