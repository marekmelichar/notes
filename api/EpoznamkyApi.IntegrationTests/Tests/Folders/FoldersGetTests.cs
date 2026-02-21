using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Folders;

[Collection("Database")]
public class FoldersGetTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Get_should_return_owned_folder()
    {
        var createResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "My Folder"));
        var created = await createResponse.ReadAs<FolderResponse>();

        var response = await Client.GetFolder(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var folder = await response.ReadAs<FolderResponse>();
        folder.Id.Should().Be(created.Id);
        folder.Name.Should().Be("My Folder");
    }

    [Fact]
    public async Task Get_should_return_404_for_other_users_folder()
    {
        var createResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Private"));
        var created = await createResponse.ReadAs<FolderResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.GetFolder(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
