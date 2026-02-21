using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Tags;

[Collection("Database")]
public class TagsAuthorizationTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task GetById_should_return_404_for_other_users_tag()
    {
        // User 1 creates a tag
        var createResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Private"));
        var tag = await createResponse.ReadAs<TagResponse>();

        // User 2 tries to access it
        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.GetTag(tag.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAll_should_not_include_other_users_tags()
    {
        // User 1 creates a tag
        await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "User1 Tag"));

        // User 2 lists tags
        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.GetTags();

        var tags = await response.ReadAs<List<TagResponse>>();
        tags.Should().BeEmpty();
    }
}
