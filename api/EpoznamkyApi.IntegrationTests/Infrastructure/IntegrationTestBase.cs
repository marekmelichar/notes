using EpoznamkyApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EpoznamkyApi.IntegrationTests.Infrastructure;

[Collection("Database")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly DatabaseFixture Db;
    protected EpoznamkyApiFactory Factory = null!;
    protected HttpClient Client = null!;

    // Default test user
    protected const string TestUserId = "user-1";
    protected const string TestUserEmail = "user1@example.com";
    protected const string TestUserName = "User One";

    // Second test user (for isolation tests)
    protected const string OtherUserId = "user-2";
    protected const string OtherUserEmail = "user2@example.com";
    protected const string OtherUserName = "User Two";

    protected IntegrationTestBase(DatabaseFixture db)
    {
        Db = db;
    }

    public virtual async Task InitializeAsync()
    {
        Factory = new EpoznamkyApiFactory(Db.ConnectionString);
        Client = Factory.CreateClient();
        Client.AsUser(TestUserId, TestUserEmail, TestUserName);

        await TruncateAllTablesAsync();
    }

    public virtual async Task DisposeAsync()
    {
        Client.Dispose();
        await Factory.DisposeAsync();
    }

    private async Task TruncateAllTablesAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE "NoteShares", "NoteTags", "FileUploads", "Notes", "Folders", "Tags", "Users" CASCADE
            """);
    }

    protected AppDbContext CreateDbContext()
    {
        var scope = Factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }
}
