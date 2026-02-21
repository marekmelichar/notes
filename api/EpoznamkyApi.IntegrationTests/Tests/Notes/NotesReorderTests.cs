using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesReorderTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Reorder_should_update_note_order()
    {
        var r1 = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "First"));
        var n1 = await r1.ReadAs<NoteResponse>();
        var r2 = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Second"));
        var n2 = await r2.ReadAs<NoteResponse>();

        var reorderRequest = new ReorderNotesRequest
        {
            Items =
            [
                new NoteOrderItem { Id = n1.Id, Order = 2 },
                new NoteOrderItem { Id = n2.Id, Order = 1 }
            ]
        };

        var response = await Client.ReorderNotes(reorderRequest);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify order changed
        var getResponse1 = await Client.GetNote(n1.Id);
        var note1 = await getResponse1.ReadAs<NoteResponse>();
        note1.Order.Should().Be(2);

        var getResponse2 = await Client.GetNote(n2.Id);
        var note2 = await getResponse2.ReadAs<NoteResponse>();
        note2.Order.Should().Be(1);
    }

    [Fact]
    public async Task Reorder_should_ignore_other_users_notes()
    {
        // User 1 creates a note
        var r1 = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "User1 Note"));
        var n1 = await r1.ReadAs<NoteResponse>();

        // User 2 tries to reorder User 1's note
        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var reorderRequest = new ReorderNotesRequest
        {
            Items = [new NoteOrderItem { Id = n1.Id, Order = 99 }]
        };

        var response = await Client.ReorderNotes(reorderRequest);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // User 1's note order should be unchanged
        Client.AsUser(TestUserId, TestUserEmail, TestUserName);
        var getResponse = await Client.GetNote(n1.Id);
        var note = await getResponse.ReadAs<NoteResponse>();
        note.Order.Should().Be(0); // Default order
    }
}
