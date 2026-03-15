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
    public async Task GetAll_should_only_return_current_users_notes()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Mine"));

        Client.AsUser(OtherUserId, OtherUserEmail, OtherUserName);
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Theirs"));

        Client.AsUser(TestUserId, TestUserEmail, TestUserName);
        var response = await Client.GetNotes();
        var result = await response.ReadAs<PaginatedResponse<NoteResponse>>();

        result.Items.Should().ContainSingle(n => n.Title == "Mine");
    }
}
