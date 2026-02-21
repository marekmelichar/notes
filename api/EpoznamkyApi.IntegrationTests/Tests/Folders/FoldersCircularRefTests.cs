using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Folders;

[Collection("Database")]
public class FoldersCircularRefTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Update_should_reject_self_as_parent()
    {
        var createResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Folder"));
        var folder = await createResponse.ReadAs<FolderResponse>();

        var response = await Client.UpdateFolder(folder.Id, TestDataFactory.UpdateFolderRequest(parentId: folder.Id));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_should_reject_circular_reference_A_to_B_to_A()
    {
        // Create A -> B hierarchy
        var aResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "A"));
        var a = await aResponse.ReadAs<FolderResponse>();

        var bResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "B", parentId: a.Id));
        var b = await bResponse.ReadAs<FolderResponse>();

        // Try to set A's parent to B (creates cycle)
        var response = await Client.UpdateFolder(a.Id, TestDataFactory.UpdateFolderRequest(parentId: b.Id));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_should_allow_valid_parent_change()
    {
        var aResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "A"));
        var a = await aResponse.ReadAs<FolderResponse>();

        var bResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "B"));
        var b = await bResponse.ReadAs<FolderResponse>();

        var cResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "C", parentId: a.Id));
        var c = await cResponse.ReadAs<FolderResponse>();

        // Move C from A to B — valid, no cycle
        var response = await Client.UpdateFolder(c.Id, TestDataFactory.UpdateFolderRequest(parentId: b.Id));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<FolderResponse>();
        updated.ParentId.Should().Be(b.Id);
    }
}
