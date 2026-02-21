using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesRestoreTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Restore_should_undelete_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Trashed"));
        var created = await createResponse.ReadAs<NoteResponse>();
        await Client.DeleteNote(created.Id);

        var response = await Client.RestoreNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var restored = await response.ReadAs<NoteResponse>();
        restored.IsDeleted.Should().BeFalse();
        restored.DeletedAt.Should().BeNull();
        restored.Title.Should().Be("Trashed");
    }

    [Fact]
    public async Task Restore_should_return_404_for_nonexistent_note()
    {
        var response = await Client.RestoreNote("nonexistent-id");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Restore_should_return_404_for_other_users_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();
        await Client.DeleteNote(created.Id);

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.RestoreNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
