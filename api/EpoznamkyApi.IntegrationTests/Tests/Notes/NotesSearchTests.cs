using System.Net;
using System.Net.Http.Json;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesSearchTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Search_should_find_notes_by_title()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Shopping list"));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Meeting notes"));

        var response = await Client.SearchNotes("shopping");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await response.ReadAs<List<NoteResponse>>();
        notes.Should().ContainSingle(n => n.Title == "Shopping list");
    }

    [Fact]
    public async Task Search_should_handle_diacritics()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Poznámky z přednášky"));

        // Search without diacritics should find the note
        var response = await Client.SearchNotes("poznamky");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await response.ReadAs<List<NoteResponse>>();
        notes.Should().ContainSingle();
    }

    [Fact]
    public async Task Search_should_return_empty_for_no_matches()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Hello world"));

        var response = await Client.SearchNotes("nonexistent");

        var notes = await response.ReadAs<List<NoteResponse>>();
        notes.Should().BeEmpty();
    }

    [Fact]
    public async Task Search_should_return_400_for_query_too_long()
    {
        var longQuery = new string('a', 201);

        var response = await Client.SearchNotes(longQuery);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_should_exclude_deleted_notes()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Deleted note"));
        var created = await createResponse.ReadAs<NoteResponse>();
        await Client.DeleteNote(created.Id); // soft delete

        var response = await Client.SearchNotes("Deleted");

        var notes = await response.ReadAs<List<NoteResponse>>();
        notes.Should().BeEmpty();
    }
}
