using System.Security.Claims;
using System.Text.Json;

namespace EpoznamkyApi.IntegrationTests.Infrastructure;

public static class TestAuthExtensions
{
    public static HttpClient AsUser(this HttpClient client, string userId, string email = "test@example.com", string name = "Test User")
    {
        var claims = new Dictionary<string, string>
        {
            ["sub"] = userId,
            [ClaimTypes.Email] = email,
            ["email"] = email,
            [ClaimTypes.Name] = name,
            ["preferred_username"] = name
        };

        client.DefaultRequestHeaders.Remove(TestAuthHandler.ClaimsHeader);
        client.DefaultRequestHeaders.Add(TestAuthHandler.ClaimsHeader, JsonSerializer.Serialize(claims));
        return client;
    }

    public static HttpClient AsAnonymous(this HttpClient client)
    {
        client.DefaultRequestHeaders.Remove(TestAuthHandler.ClaimsHeader);
        return client;
    }
}
