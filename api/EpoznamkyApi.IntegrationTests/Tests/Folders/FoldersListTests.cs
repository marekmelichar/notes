using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Folders;

[Collection("Database")]
public class FoldersListTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task GetAll_should_return_empty_list_initially()
    {
        var response = await Client.GetFolders();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var folders = await response.ReadAs<List<FolderResponse>>();
        folders.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAll_should_return_only_owned_folders()
    {
        // User 1 creates a folder
        await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "User1 Folder"));

        // User 2 creates a folder
        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "User2 Folder"));

        // User 1 should only see their folder
        Client.AsUser(TestUserId, TestUserEmail, TestUserName);
        var response = await Client.GetFolders();
        var folders = await response.ReadAs<List<FolderResponse>>();

        folders.Should().HaveCount(1);
        folders[0].Name.Should().Be("User1 Folder");
    }
}
