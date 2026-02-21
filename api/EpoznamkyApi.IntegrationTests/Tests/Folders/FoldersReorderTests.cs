using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Folders;

[Collection("Database")]
public class FoldersReorderTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Reorder_should_update_folder_order()
    {
        var r1 = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "First"));
        var f1 = await r1.ReadAs<FolderResponse>();

        var r2 = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Second"));
        var f2 = await r2.ReadAs<FolderResponse>();

        var reorderRequest = new ReorderFoldersRequest
        {
            Items =
            [
                new FolderOrderItem { Id = f1.Id, Order = 2 },
                new FolderOrderItem { Id = f2.Id, Order = 1 }
            ]
        };

        var response = await Client.ReorderFolders(reorderRequest);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify order changed
        var listResponse = await Client.GetFolders();
        var folders = await listResponse.ReadAs<List<FolderResponse>>();
        folders.Should().HaveCount(2);
        folders.First(f => f.Id == f1.Id).Order.Should().Be(2);
        folders.First(f => f.Id == f2.Id).Order.Should().Be(1);
    }
}
