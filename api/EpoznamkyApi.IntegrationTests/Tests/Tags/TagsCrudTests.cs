using System.Net;
using System.Net.Http.Json;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Tags;

[Collection("Database")]
public class TagsCrudTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task GetAll_should_return_empty_list_initially()
    {
        var response = await Client.GetTags();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tags = await response.ReadAs<List<TagResponse>>();
        tags.Should().BeEmpty();
    }

    [Fact]
    public async Task Create_should_return_created_tag()
    {
        var request = TestDataFactory.CreateTagRequest(name: "Work", color: "#ff0000");

        var response = await Client.CreateTag(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var tag = await response.ReadAs<TagResponse>();
        tag.Name.Should().Be("Work");
        tag.Color.Should().Be("#ff0000");
        tag.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_empty_name()
    {
        var request = TestDataFactory.CreateTagRequest(name: "");

        var response = await Client.CreateTag(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_should_return_validation_error_for_invalid_color()
    {
        var request = TestDataFactory.CreateTagRequest(color: "not-a-color");

        var response = await Client.CreateTag(request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetById_should_return_owned_tag()
    {
        var createResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Personal"));
        var created = await createResponse.ReadAs<TagResponse>();

        var response = await Client.GetTag(created.Id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var tag = await response.ReadAs<TagResponse>();
        tag.Id.Should().Be(created.Id);
        tag.Name.Should().Be("Personal");
    }

    [Fact]
    public async Task Update_should_modify_tag_properties()
    {
        var createResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest(name: "Old Name"));
        var created = await createResponse.ReadAs<TagResponse>();

        var response = await Client.UpdateTag(created.Id, TestDataFactory.UpdateTagRequest(name: "New Name", color: "#00ff00"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<TagResponse>();
        updated.Name.Should().Be("New Name");
        updated.Color.Should().Be("#00ff00");
    }

    [Fact]
    public async Task Delete_should_remove_tag_and_cascade_to_note_tags()
    {
        // Create tag
        var tagResponse = await Client.CreateTag(TestDataFactory.CreateTagRequest());
        var tag = await tagResponse.ReadAs<TagResponse>();

        // Create note with that tag
        var noteResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(tags: [tag.Id]));
        var note = await noteResponse.ReadAs<NoteResponse>();
        note.Tags.Should().Contain(tag.Id);

        // Delete tag
        var deleteResponse = await Client.DeleteTag(tag.Id);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify tag is gone
        var getResponse = await Client.GetTag(tag.Id);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Verify note no longer has the tag
        var noteGetResponse = await Client.GetNote(note.Id);
        var updatedNote = await noteGetResponse.ReadAs<NoteResponse>();
        updatedNote.Tags.Should().NotContain(tag.Id);
    }
}
