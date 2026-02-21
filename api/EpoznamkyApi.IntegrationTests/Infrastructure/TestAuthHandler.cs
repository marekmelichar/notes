using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EpoznamkyApi.IntegrationTests.Infrastructure;

public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "TestScheme";
    public const string ClaimsHeader = "X-Test-User-Claims";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ClaimsHeader, out var claimsJson) ||
            string.IsNullOrEmpty(claimsJson))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claimPairs = JsonSerializer.Deserialize<Dictionary<string, string>>(claimsJson!);
        if (claimPairs == null)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid claims JSON"));
        }

        var claims = claimPairs.Select(kvp => new Claim(kvp.Key, kvp.Value)).ToList();
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
