using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesDeleteTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task SoftDelete_should_mark_note_as_deleted()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "To Trash"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var response = await Client.DeleteNote(created.Id);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Note should still exist but be marked as deleted
        var getResponse = await Client.GetNote(created.Id);
        var note = await getResponse.ReadAs<NoteResponse>();
        note.IsDeleted.Should().BeTrue();
        note.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task PermanentDelete_should_remove_note_completely()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "To Delete"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var response = await Client.DeleteNotePermanent(created.Id);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Note should not exist anymore
        var getResponse = await Client.GetNote(created.Id);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SoftDelete_should_return_404_for_nonexistent_note()
    {
        var response = await Client.DeleteNote("nonexistent-id");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SoftDelete_should_return_404_for_other_users_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.DeleteNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PermanentDelete_should_cascade_to_tags_and_shares()
    {
        var tagResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest());
        var tag = await tagResponse.ReadAs<TagResponse>();

        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(tags: [tag.Id]));
        var created = await createResponse.ReadAs<NoteResponse>();
        await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail));

        // Permanently delete
        var deleteResponse = await Client.DeleteNotePermanent(created.Id);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Note is gone
        var getResponse = await Client.GetNote(created.Id);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
