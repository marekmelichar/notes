using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesUpdateTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Update_should_change_title()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Original"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var response = await Client.UpdateNote(created.Id, TestDataFactory.UpdateNoteRequest(title: "Updated"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<NoteResponse>();
        updated.Title.Should().Be("Updated");
    }

    [Fact]
    public async Task Update_should_support_partial_updates()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(
            title: "Original", content: "Original content"));
        var created = await createResponse.ReadAs<NoteResponse>();

        // Update only content, title should remain unchanged
        var response = await Client.UpdateNote(created.Id, TestDataFactory.UpdateNoteRequest(content: "New content"));

        var updated = await response.ReadAs<NoteResponse>();
        updated.Title.Should().Be("Original");
        updated.Content.Should().Be("New content");
    }

    [Fact]
    public async Task Update_should_clear_folder_with_empty_string()
    {
        var folderResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Work"));
        var folder = await folderResponse.ReadAs<FolderResponse>();

        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(folderId: folder.Id));
        var created = await createResponse.ReadAs<NoteResponse>();
        created.FolderId.Should().Be(folder.Id);

        // Clear folder by sending empty string
        var response = await Client.UpdateNote(created.Id, TestDataFactory.UpdateNoteRequest(folderId: ""));

        var updated = await response.ReadAs<NoteResponse>();
        updated.FolderId.Should().BeNull();
    }

    [Fact]
    public async Task Update_should_replace_tags()
    {
        var tag1Response = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Tag1"));
        var tag1 = await tag1Response.ReadAs<TagResponse>();
        var tag2Response = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Tag2"));
        var tag2 = await tag2Response.ReadAs<TagResponse>();

        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(tags: [tag1.Id]));
        var created = await createResponse.ReadAs<NoteResponse>();
        created.Tags.Should().ContainSingle(t => t == tag1.Id);

        // Replace tags with tag2
        var response = await Client.UpdateNote(created.Id, TestDataFactory.UpdateNoteRequest(tags: [tag2.Id]));

        var updated = await response.ReadAs<NoteResponse>();
        updated.Tags.Should().ContainSingle(t => t == tag2.Id);
        updated.Tags.Should().NotContain(tag1.Id);
    }

    [Fact]
    public async Task Update_should_return_404_for_other_users_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.UpdateNote(created.Id, TestDataFactory.UpdateNoteRequest(title: "Hacked"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
