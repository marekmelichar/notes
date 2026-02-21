namespace EpoznamkyApi.Services;

public class TrashCleanupService(IServiceScopeFactory scopeFactory, ILogger<TrashCleanupService> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Trash cleanup service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during trash cleanup");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task CleanupAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var noteService = scope.ServiceProvider.GetRequiredService<NoteService>();
        var fileService = scope.ServiceProvider.GetRequiredService<FileService>();

        // Collect file paths before deleting notes (ExecuteDeleteAsync won't trigger EF navigation)
        var storedFiles = await noteService.GetStoredFilesForExpiredTrashAsync(30);

        var deletedCount = await noteService.CleanupOldTrashAsync(30);

        if (deletedCount > 0)
        {
            logger.LogInformation("Permanently deleted {Count} notes from trash", deletedCount);

            // Best-effort disk cleanup for associated files
            foreach (var storedFilename in storedFiles)
            {
                fileService.DeleteFile(storedFilename);
            }
        }
    }
}
