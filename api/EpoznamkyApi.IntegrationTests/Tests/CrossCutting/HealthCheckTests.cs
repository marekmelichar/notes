using System.Net;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.CrossCutting;

[Collection("Database")]
public class HealthCheckTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task LiveEndpoint_should_return_healthy()
    {
        var response = await Client.GetAsync("/health/live");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ReadyEndpoint_should_return_healthy_when_database_is_available()
    {
        var response = await Client.GetAsync("/health/ready");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
