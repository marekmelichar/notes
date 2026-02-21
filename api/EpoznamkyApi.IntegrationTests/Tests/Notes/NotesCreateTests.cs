using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesCreateTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Create_should_return_created_note()
    {
        var request = TestDataFactory.CreateNoteRequest(title: "New Note", content: "Hello world");

        var response = await Client.CreateNote(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var note = await response.ReadAs<NoteResponse>();
        note.Title.Should().Be("New Note");
        note.Content.Should().Be("Hello world");
        note.Id.Should().NotBeNullOrEmpty();
        note.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Create_should_support_tags_and_folder()
    {
        // Create folder and tag first
        var folderResponse = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Work"));
        var folder = await folderResponse.ReadAs<FolderResponse>();

        var tagResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Important"));
        var tag = await tagResponse.ReadAs<TagResponse>();

        var request = TestDataFactory.CreateNoteRequest(
            title: "Organized Note",
            folderId: folder.Id,
            tags: [tag.Id]);

        var response = await Client.CreateNote(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var note = await response.ReadAs<NoteResponse>();
        note.FolderId.Should().Be(folder.Id);
        note.Tags.Should().ContainSingle(t => t == tag.Id);
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_empty_title()
    {
        var request = TestDataFactory.CreateNoteRequest(title: "");

        var response = await Client.CreateNote(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_title_too_long()
    {
        var request = TestDataFactory.CreateNoteRequest(title: new string('x', 501));

        var response = await Client.CreateNote(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_should_set_timestamps()
    {
        var beforeCreate = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var response = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var note = await response.ReadAs<NoteResponse>();

        var afterCreate = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        note.CreatedAt.Should().BeInRange(beforeCreate, afterCreate);
        note.UpdatedAt.Should().BeInRange(beforeCreate, afterCreate);
    }
}
