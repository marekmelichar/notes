using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.CrossCutting;

[Collection("Database")]
public class SecurityHeadersTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Response_should_contain_XContentTypeOptions_header()
    {
        var response = await Client.GetTags();

        response.Headers.GetValues("X-Content-Type-Options")
            .Should().ContainSingle().Which.Should().Be("nosniff");
    }

    [Fact]
    public async Task Response_should_contain_XFrameOptions_header()
    {
        var response = await Client.GetTags();

        response.Headers.GetValues("X-Frame-Options")
            .Should().ContainSingle().Which.Should().Be("DENY");
    }

    [Fact]
    public async Task Response_should_contain_ReferrerPolicy_header()
    {
        var response = await Client.GetTags();

        response.Headers.GetValues("Referrer-Policy")
            .Should().ContainSingle().Which.Should().Be("strict-origin-when-cross-origin");
    }
}
