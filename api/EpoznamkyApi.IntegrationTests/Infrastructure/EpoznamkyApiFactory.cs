using EpoznamkyApi.Data;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace EpoznamkyApi.IntegrationTests.Infrastructure;

public class EpoznamkyApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString;
    private readonly string _uploadDirectory;

    public EpoznamkyApiFactory(string connectionString)
    {
        _connectionString = connectionString;
        _uploadDirectory = Path.Combine(Path.GetTempPath(), $"epoznamky_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_uploadDirectory);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // Replace DbContext with Testcontainers connection
            var dbDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor != null)
                services.Remove(dbDescriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_connectionString));

            // Replace JWT auth with test auth handler
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });

            // Override file storage settings to use temp directory
            services.Configure<FileStorageSettings>(opts =>
            {
                opts.UploadDirectory = _uploadDirectory;
            });

            // Remove TrashCleanupService (background service interferes with tests)
            var hostedServiceDescriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IHostedService) &&
                d.ImplementationType == typeof(TrashCleanupService));
            if (hostedServiceDescriptor != null)
                services.Remove(hostedServiceDescriptor);
        });
    }

    public string UploadDirectory => _uploadDirectory;

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (Directory.Exists(_uploadDirectory))
        {
            try { Directory.Delete(_uploadDirectory, true); } catch { /* best effort */ }
        }
    }
}
