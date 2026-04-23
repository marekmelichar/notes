using System.ComponentModel.DataAnnotations;
using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class NotesController(NoteService noteService, FileService fileService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<NoteResponse>>> GetAll(
        [FromQuery][Range(0, 1000)] int limit = 100,
        [FromQuery][Range(0, int.MaxValue)] int offset = 0)
    {
        return await noteService.GetNotesAsync(UserId, limit, offset);
    }

    private static readonly string[] AllowedSortBy = ["updatedAt", "createdAt", "title"];
    private static readonly string[] AllowedSortOrder = ["asc", "desc"];

    [HttpGet("list")]
    public async Task<ActionResult<PaginatedResponse<NoteListResponse>>> GetList(
        [FromQuery][Range(0, 1000)] int limit = 100,
        [FromQuery][Range(0, int.MaxValue)] int offset = 0,
        [FromQuery] string? folderId = null,
        [FromQuery] string? tagIds = null,
        [FromQuery] bool? isPinned = null,
        [FromQuery] bool? isDeleted = null,
        [FromQuery] string sortBy = "updatedAt",
        [FromQuery] string sortOrder = "desc")
    {
        if (!AllowedSortBy.Contains(sortBy, StringComparer.OrdinalIgnoreCase))
            return Problem(detail: $"Invalid sortBy value. Allowed: {string.Join(", ", AllowedSortBy)}", statusCode: 400);
        if (!AllowedSortOrder.Contains(sortOrder, StringComparer.OrdinalIgnoreCase))
            return Problem(detail: "Invalid sortOrder value. Allowed: asc, desc", statusCode: 400);

        var parsedTagIds = string.IsNullOrWhiteSpace(tagIds)
            ? null
            : tagIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        // Default isDeleted to false when not explicitly provided
        var effectiveIsDeleted = isDeleted ?? false;

        return await noteService.GetNoteListAsync(
            UserId, limit, offset, folderId, parsedTagIds, isPinned, effectiveIsDeleted, sortBy, sortOrder);
    }

    [HttpGet("list/search")]
    public async Task<ActionResult<List<NoteListResponse>>> SearchList([FromQuery] string? q)
    {
        if (q?.Length > 200)
            return Problem(detail: "Search query must not exceed 200 characters.", statusCode: 400);

        return await noteService.SearchNotesListAsync(UserId, q ?? "");
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NoteResponse>> Get(string id)
    {
        var note = await noteService.GetNoteAsync(id, UserId);
        if (note == null) return NotFound();
        return note;
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<NoteResponse>>> Search([FromQuery] string? q)
    {
        if (q?.Length > 200)
            return Problem(detail: "Search query must not exceed 200 characters.", statusCode: 400);

        return await noteService.SearchNotesAsync(UserId, q ?? "");
    }

    [HttpPost]
    public async Task<ActionResult<NoteResponse>> Create([FromBody] CreateNoteRequest request)
    {
        try
        {
            var created = await noteService.CreateNoteAsync(request, UserId);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: 400);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteResponse>> Update(string id, [FromBody] UpdateNoteRequest request)
    {
        try
        {
            var note = await noteService.UpdateNoteAsync(id, UserId, request);
            if (note == null) return NotFound();
            return note;
        }
        catch (NoteConflictException ex)
        {
            return Problem(detail: ex.Message, statusCode: 409);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: 400);
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var note = await noteService.SoftDeleteNoteAsync(id, UserId);
        if (note == null) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}/permanent")]
    public async Task<ActionResult> DeletePermanent(string id)
    {
        // Clean up associated files from disk before deleting the note
        var storedFiles = await noteService.GetFileStoredNamesForNoteAsync(id);

        if (!await noteService.DeleteNoteAsync(id, UserId)) return NotFound();

        // Best-effort disk cleanup after successful DB delete
        foreach (var storedFilename in storedFiles)
        {
            fileService.DeleteFile(storedFilename);
        }

        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<NoteResponse>> Restore(string id)
    {
        var note = await noteService.RestoreNoteAsync(id, UserId);
        if (note == null) return NotFound();
        return note;
    }

    [HttpPost("reorder")]
    public async Task<ActionResult> Reorder([FromBody] ReorderNotesRequest request)
    {
        await noteService.ReorderNotesAsync(UserId, request.Items);
        return NoContent();
    }
}
