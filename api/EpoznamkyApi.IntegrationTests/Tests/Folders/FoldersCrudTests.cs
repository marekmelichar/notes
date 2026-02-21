using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Folders;

[Collection("Database")]
public class FoldersCrudTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Create_should_return_created_folder()
    {
        var request = TestDataFactory.CreateFolderRequest(name: "Work", color: "#ff0000");

        var response = await Client.CreateFolder(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var folder = await response.ReadAs<FolderResponse>();
        folder.Name.Should().Be("Work");
        folder.Color.Should().Be("#ff0000");
        folder.Id.Should().NotBeNullOrEmpty();
        folder.ParentId.Should().BeNull();
    }

    [Fact]
    public async Task Create_should_support_parent_folder()
    {
        var parentResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Parent"));
        var parent = await parentResponse.ReadAs<FolderResponse>();

        var childResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Child", parentId: parent.Id));
        var child = await childResponse.ReadAs<FolderResponse>();

        child.ParentId.Should().Be(parent.Id);
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_empty_name()
    {
        var request = TestDataFactory.CreateFolderRequest(name: "");

        var response = await Client.CreateFolder(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_invalid_color()
    {
        var request = TestDataFactory.CreateFolderRequest(color: "red");

        var response = await Client.CreateFolder(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_should_modify_folder_properties()
    {
        var createResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Old"));
        var created = await createResponse.ReadAs<FolderResponse>();

        var response = await Client.UpdateFolder(created.Id, TestDataFactory.UpdateFolderRequest(name: "New", color: "#00ff00"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<FolderResponse>();
        updated.Name.Should().Be("New");
        updated.Color.Should().Be("#00ff00");
    }

    [Fact]
    public async Task Delete_should_remove_folder_and_clear_notes_folderId()
    {
        // Create folder
        var folderResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "To Delete"));
        var folder = await folderResponse.ReadAs<FolderResponse>();

        // Create note in that folder
        var noteResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(folderId: folder.Id));
        var note = await noteResponse.ReadAs<NoteResponse>();
        note.FolderId.Should().Be(folder.Id);

        // Delete folder
        var deleteResponse = await Client.DeleteFolder(folder.Id);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify folder is gone
        var getResponse = await Client.GetFolder(folder.Id);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Verify note's folderId is cleared
        var noteGetResponse = await Client.GetNote(note.Id);
        var updatedNote = await noteGetResponse.ReadAs<NoteResponse>();
        updatedNote.FolderId.Should().BeNull();
    }
}
