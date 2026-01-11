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
        var dataService = scope.ServiceProvider.GetRequiredService<DataService>();

        var deletedCount = await dataService.CleanupOldTrashAsync(30);

        if (deletedCount > 0)
        {
            logger.LogInformation("Permanently deleted {Count} notes from trash", deletedCount);
        }
    }
}
