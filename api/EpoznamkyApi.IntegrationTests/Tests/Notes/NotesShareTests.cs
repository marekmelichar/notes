using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesShareTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Share_should_add_shared_user()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Shareable"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var shareResponse = await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail));

        shareResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await shareResponse.ReadAs<NoteResponse>();
        note.SharedWith.Should().ContainSingle(s => s.Email == OtherUserEmail);
        note.SharedWith[0].Permission.Should().Be("view");
    }

    [Fact]
    public async Task Share_should_update_permission_for_existing_share()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        // Share with view
        await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail, permission: "view"));

        // Update to edit
        var updateResponse = await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail, permission: "edit"));

        var note = await updateResponse.ReadAs<NoteResponse>();
        note.SharedWith.Should().ContainSingle();
        note.SharedWith[0].Permission.Should().Be("edit");
    }

    [Fact]
    public async Task RemoveShare_should_remove_shared_user()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        var shareResponse = await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: OtherUserEmail));
        var sharedNote = await shareResponse.ReadAs<NoteResponse>();
        var sharedUserId = sharedNote.SharedWith[0].UserId;

        var removeResponse = await Client.RemoveShare(created.Id, sharedUserId);

        removeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await removeResponse.ReadAs<NoteResponse>();
        note.SharedWith.Should().BeEmpty();
    }

    [Fact]
    public async Task Share_should_return_404_for_nonexistent_note()
    {
        var response = await Client.ShareNote("nonexistent-id", TestDataFactory.ShareNoteRequest());

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Share_should_return_404_for_other_users_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.ShareNote(created.Id, TestDataFactory.ShareNoteRequest(email: "third@example.com"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
