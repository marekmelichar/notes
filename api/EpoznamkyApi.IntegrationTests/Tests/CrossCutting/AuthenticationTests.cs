using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.CrossCutting;

[Collection("Database")]
public class AuthenticationTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task AuthorizedEndpoint_should_return_401_when_no_auth_header()
    {
        Client.AsAnonymous();

        var response = await Client.GetNotes();

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AllowAnonymous_file_GET_should_return_404_not_401_for_missing_file()
    {
        Client.AsAnonymous();

        var response = await Client.GetFile("nonexistent-id");

        // Should be 404 (not found), NOT 401 (unauthorized) — proves AllowAnonymous works
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
