using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesGetTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Get_should_return_owned_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "My Note"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var response = await Client.GetNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await response.ReadAs<NoteResponse>();
        note.Id.Should().Be(created.Id);
        note.Title.Should().Be("My Note");
    }

    [Fact]
    public async Task Get_should_return_404_for_other_users_note()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Private"));
        var created = await createResponse.ReadAs<NoteResponse>();

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var response = await Client.GetNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Get_should_return_404_for_nonexistent_note()
    {
        var response = await Client.GetNote("nonexistent-id");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Get_should_return_deleted_note_to_owner()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Private"));
        var created = await createResponse.ReadAs<NoteResponse>();

        await Client.DeleteNote(created.Id);
        var response = await Client.GetNote(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await response.ReadAs<NoteResponse>();
        note.IsDeleted.Should().BeTrue();
    }
}
