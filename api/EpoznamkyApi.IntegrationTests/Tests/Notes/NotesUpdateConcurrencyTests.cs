using System.Net;
using System.Net.Http.Json;
using EpoznamkyApi.IntegrationTests.Helpers;
using EpoznamkyApi.IntegrationTests.Infrastructure;
using EpoznamkyApi.Models;
using FluentAssertions;

namespace EpoznamkyApi.IntegrationTests.Tests.Notes;

/// <summary>
/// Covers the optimistic-concurrency + suspicious-shrink guards added to
/// UpdateNoteAsync after the 2026-04-23 ghost-tab wipe incident
/// (note 598aaef5-c760-4337-93f6-403967812af8). See ADR 0009.
/// </summary>
[Collection("Database")]
public class NotesUpdateConcurrencyTests(DatabaseFixture db) : IntegrationTestBase(db)
{
    [Fact]
    public async Task Content_update_with_matching_UpdatedAt_should_succeed()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: "original"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var request = TestDataFactory.UpdateNoteRequest(content: "new content");
        request.UpdatedAt = created.UpdatedAt;

        var response = await Client.UpdateNote(created.Id, request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<NoteResponse>();
        updated.Content.Should().Be("new content");
        updated.UpdatedAt.Should().BeGreaterThan(created.UpdatedAt);
    }

    [Fact]
    public async Task Content_update_with_stale_UpdatedAt_should_return_409()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: "original"));
        var created = await createResponse.ReadAs<NoteResponse>();

        // First save by tab A: succeeds, bumps UpdatedAt.
        var firstSave = TestDataFactory.UpdateNoteRequest(content: "tab A edit");
        firstSave.UpdatedAt = created.UpdatedAt;
        (await Client.UpdateNote(created.Id, firstSave)).StatusCode.Should().Be(HttpStatusCode.OK);

        // Stale tab B still holds the original UpdatedAt — must 409, not overwrite.
        var staleSave = TestDataFactory.UpdateNoteRequest(content: "tab B stale edit");
        staleSave.UpdatedAt = created.UpdatedAt;

        var response = await Client.UpdateNote(created.Id, staleSave);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Content_update_without_UpdatedAt_should_return_400()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: "original content here"));
        var created = await createResponse.ReadAs<NoteResponse>();

        // Missing UpdatedAt on a content update is a malformed request (the
        // client must supply the concurrency token). Distinct status from 409
        // so clients can tell "you didn't opt in" from "your token is stale".
        var request = TestDataFactory.UpdateNoteRequest(content: "anything");

        var response = await Client.UpdateNote(created.Id, request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Metadata_only_update_without_UpdatedAt_should_succeed()
    {
        // Metadata updates (pin, folder, tags, order) don't require the
        // concurrency token — they only rewrite tiny scalar fields and aren't
        // the source of the data-loss class we're defending against.
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest());
        var created = await createResponse.ReadAs<NoteResponse>();

        var response = await Client.UpdateNote(
            created.Id,
            TestDataFactory.UpdateNoteRequest(isPinned: true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.ReadAs<NoteResponse>();
        updated.IsPinned.Should().BeTrue();
        updated.Content.Should().Be(created.Content);
    }

    [Fact]
    public async Task Suspicious_shrink_should_return_409()
    {
        // The exact 2026-04-23 failure mode: a ~36 KB note replaced with an
        // empty TipTap doc. We reject any save where a non-trivial existing
        // note would be overwritten by near-empty content, even with a
        // matching UpdatedAt token.
        var bigContent = new string('x', 1024);
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: bigContent));
        var created = await createResponse.ReadAs<NoteResponse>();

        var request = TestDataFactory.UpdateNoteRequest(content: "[]");
        request.UpdatedAt = created.UpdatedAt;

        var response = await Client.UpdateNote(created.Id, request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        // Sanity check: the server-side content is unchanged.
        var still = await (await Client.GetNote(created.Id)).ReadAs<NoteResponse>();
        still.Content.Should().Be(bigContent);
    }

    [Fact]
    public async Task Legitimate_small_edit_from_small_baseline_should_succeed()
    {
        // If the existing note is itself small, the suspicious-shrink guard
        // shouldn't fire — no risk of losing user content.
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: "tiny"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var request = TestDataFactory.UpdateNoteRequest(content: "");
        request.UpdatedAt = created.UpdatedAt;

        var response = await Client.UpdateNote(created.Id, request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Conflict_response_should_use_ProblemDetails_JSON()
    {
        var createResponse = await Client.CreateNote(TestDataFactory.CreateNoteRequest(content: "original"));
        var created = await createResponse.ReadAs<NoteResponse>();

        var request = TestDataFactory.UpdateNoteRequest(content: "anything");
        request.UpdatedAt = created.UpdatedAt + 12345; // guaranteed wrong

        var response = await Client.UpdateNote(created.Id, request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetailsDto>();
        problem.Should().NotBeNull();
        problem!.Status.Should().Be(409);
        problem.Detail.Should().NotBeNullOrWhiteSpace();
    }

    private sealed class ProblemDetailsDto
    {
        public int? Status { get; set; }
        public string? Title { get; set; }
        public string? Detail { get; set; }
        public string? Type { get; set; }
    }
}
