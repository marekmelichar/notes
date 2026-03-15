using System.Net;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

[Collection("Database")]
public class NotesListEndpointTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task List_should_return_notes_without_content()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Note 1", content: "Secret body"));

        var response = await Client.GetNoteList();
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.ReadAs<PaginatedResponse<NoteListResponse>>();
        result.Items.Should().HaveCount(1);
        result.Items[0].Title.Should().Be("Note 1");

        // NoteListResponse should not have a Content property — verify via JSON
        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContain("\"content\"");
    }

    [Fact]
    public async Task List_should_filter_by_isDeleted()
    {
        var createResp = await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Active"));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Trashed"));
        var trashed = await (await Client.GetNoteList()).ReadAs<PaginatedResponse<NoteListResponse>>();
        var trashedNote = trashed.Items.First(n => n.Title == "Trashed");
        await Client.DeleteNote(trashedNote.Id);

        // Default: isDeleted=false
        var activeList = await (await Client.GetNoteList()).ReadAs<PaginatedResponse<NoteListResponse>>();
        activeList.Items.Should().OnlyContain(n => !n.IsDeleted);

        // Explicit: isDeleted=true
        var trashList = await (await Client.GetNoteList("isDeleted=true")).ReadAs<PaginatedResponse<NoteListResponse>>();
        trashList.Items.Should().OnlyContain(n => n.IsDeleted);
    }

    [Fact]
    public async Task List_should_filter_by_folder()
    {
        var folderResp = await Client.CreateFolder(TestDataFactory.CreateFolderRequest(name: "Work"));
        var folder = await folderResp.ReadAs<FolderResponse>();

        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "In folder", folderId: folder.Id));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "No folder"));

        var result = await (await Client.GetNoteList($"folderId={folder.Id}"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        result.Items.Should().HaveCount(1);
        result.Items[0].Title.Should().Be("In folder");
    }

    [Fact]
    public async Task List_should_filter_by_tags()
    {
        var tagResp = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Important"));
        var tag = await tagResp.ReadAs<TagResponse>();

        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Tagged", tags: [tag.Id]));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Untagged"));

        var result = await (await Client.GetNoteList($"tagIds={tag.Id}"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        result.Items.Should().HaveCount(1);
        result.Items[0].Title.Should().Be("Tagged");
    }

    [Fact]
    public async Task List_should_filter_by_isPinned()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Pinned", isPinned: true));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Normal"));

        var result = await (await Client.GetNoteList("isPinned=true"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        result.Items.Should().HaveCount(1);
        result.Items[0].Title.Should().Be("Pinned");
    }

    [Fact]
    public async Task List_should_sort_by_title_asc()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Banana"));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Apple"));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Cherry"));

        var result = await (await Client.GetNoteList("sortBy=title&sortOrder=asc"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        result.Items.Select(n => n.Title).Should().ContainInOrder("Apple", "Banana", "Cherry");
    }

    [Fact]
    public async Task List_should_sort_by_updatedAt_desc_by_default()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "First"));
        await Task.Delay(50);
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Second"));
        await Task.Delay(50);
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Third"));

        var result = await (await Client.GetNoteList())
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        // Default sort: updatedAt desc → most recent first
        result.Items[0].Title.Should().Be("Third");
    }

    [Fact]
    public async Task List_should_paginate_with_limit_and_offset()
    {
        for (var i = 0; i < 5; i++)
        {
            await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: $"Note {i}"));
            await Task.Delay(20);
        }

        var page1 = await (await Client.GetNoteList("limit=2&offset=0&sortBy=createdAt&sortOrder=asc"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        page1.Items.Should().HaveCount(2);
        page1.TotalCount.Should().Be(5);
        page1.Limit.Should().Be(2);
        page1.Offset.Should().Be(0);

        var page2 = await (await Client.GetNoteList("limit=2&offset=2&sortBy=createdAt&sortOrder=asc"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        page2.Items.Should().HaveCount(2);
        page2.Items[0].Id.Should().NotBe(page1.Items[0].Id);
    }

    [Fact]
    public async Task SearchList_should_return_matching_notes_without_content()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Meeting notes", content: "Discuss project"));
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Shopping list", content: "Buy groceries"));

        var response = await Client.SearchNoteList("meeting");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var results = await response.ReadAs<List<NoteListResponse>>();
        results.Should().HaveCount(1);
        results[0].Title.Should().Be("Meeting notes");

        // Verify no content in response
        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContain("\"content\"");
    }

    [Fact]
    public async Task SearchList_should_return_empty_for_no_match()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Test note"));

        var results = await (await Client.SearchNoteList("nonexistent"))
            .ReadAs<List<NoteListResponse>>();

        results.Should().BeEmpty();
    }

    [Fact]
    public async Task List_pinned_notes_should_come_first()
    {
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Normal"));
        await Task.Delay(20);
        await Client.CreateNote(TestDataFactory.CreateNoteRequest(title: "Pinned", isPinned: true));

        var result = await (await Client.GetNoteList("sortBy=updatedAt&sortOrder=desc"))
            .ReadAs<PaginatedResponse<NoteListResponse>>();

        result.Items[0].Title.Should().Be("Pinned");
        result.Items[0].IsPinned.Should().BeTrue();
    }
}
