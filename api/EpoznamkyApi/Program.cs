using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using EpoznamkyApi.Data;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Disable default claim type mapping to preserve original JWT claim names (e.g., 'sub' instead of mapped Microsoft types)
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

var isDevelopment = builder.Environment.IsDevelopment();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 104_857_600; // 100 MB
});

// Add ProblemDetails for consistent error responses
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
    };
});

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<DataService>();
builder.Services.AddHostedService<TrashCleanupService>();

builder.Services.Configure<FileStorageSettings>(
    builder.Configuration.GetSection("FileStorage"));
builder.Services.AddScoped<FileStorageService>();

// Health checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "postgresql",
        tags: ["ready"]);

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global policy: 100 requests/min per authenticated user (or IP for anonymous)
    options.AddPolicy("global", context =>
    {
        var userId = context.User?.FindFirst("sub")?.Value;
        var key = userId ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        });
    });

    // Stricter policy for file uploads: 10/min
    options.AddPolicy("file-upload", context =>
    {
        var userId = context.User?.FindFirst("sub")?.Value ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter($"upload:{userId}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1)
        });
    });

    // Stricter policy for user search: 30/min
    options.AddPolicy("user-search", context =>
    {
        var userId = context.User?.FindFirst("sub")?.Value ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter($"search:{userId}", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1)
        });
    });
});

// Configure JWT Authentication with Keycloak
var keycloakAuthority = builder.Configuration["Keycloak:Authority"] ?? "http://localhost:8080/realms/notes";

// In production, tokens are issued with the external URL (e.g. https://notes.nettio.eu/realms/notes)
// which differs from the internal authority (http://keycloak:8080/realms/notes).
// Keycloak:Issuer overrides the expected issuer for token validation.
var keycloakIssuer = builder.Configuration["Keycloak:Issuer"] ?? keycloakAuthority;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = keycloakAuthority;
        options.Audience = "account";
        // Container-to-container communication uses HTTP — HTTPS is enforced at the Nginx edge
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !isDevelopment,
            ValidateAudience = !isDevelopment,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = keycloakIssuer,
            ValidAudience = "account",
            NameClaimType = "preferred_username",
            RoleClaimType = "realm_access"
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "https://notes.nettio.eu"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Structured JSON logging for production
if (!isDevelopment)
{
    builder.Logging.AddJsonConsole();
}

var app = builder.Build();

// Apply pending migrations on startup (for development/Docker)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Forward headers from reverse proxy (Nginx) so rate limiting sees real client IP
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Global error handling
app.UseExceptionHandler();
app.UseStatusCodePages();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

// Health check endpoints (unauthenticated for Docker/k8s probes)
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers().RequireRateLimiting("global");

app.Run();
