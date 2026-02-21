using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesListTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task GetAll_should_return_empty_list_initially()
    {
        var response = await Client.GetNotes();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.ReadAs<PaginatedResponse<NoteResponse>>();
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task GetAll_should_return_paginated_response()
    {
        // Create 3 notes
        for (var i = 1; i <= 3; i++)
            await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: $"Note {i}"));

        var response = await Client.GetNotes();
        var result = await response.ReadAs<PaginatedResponse<NoteResponse>>();

        result.Items.Should().HaveCount(3);
        result.TotalCount.Should().Be(3);
        result.Limit.Should().Be(100);
        result.Offset.Should().Be(0);
    }

    [Fact]
    public async Task GetAll_should_respect_limit_and_offset()
    {
        for (var i = 1; i <= 5; i++)
            await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: $"Note {i}"));

        var response = await Client.GetNotes(limit: 2, offset: 1);
        var result = await response.ReadAs<PaginatedResponse<NoteResponse>>();

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(5);
        result.Limit.Should().Be(2);
        result.Offset.Should().Be(1);
    }

    [Fact]
    public async Task GetAll_should_include_shared_notes()
    {
        // User 2 creates a note and shares it with User 1
        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        var noteResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Shared Note"));
        var note = await noteResponse.ReadAs<NoteResponse>();
        await Client.ShareNote(note.Id, TestDataFactory.ShareNoteRequest(email: TestUserEmail));

        // User 1 should see it in their list
        Client.AsUser(TestUserId, TestUserEmail, TestUserName);
        var response = await Client.GetNotes();
        var result = await response.ReadAs<PaginatedResponse<NoteResponse>>();

        result.Items.Should().ContainSingle(n => n.Title == "Shared Note");
    }
}
