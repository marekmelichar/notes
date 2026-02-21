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
        [FromQuery][Range(1, 1000)] int limit = 100,
        [FromQuery][Range(0, int.MaxValue)] int offset = 0)
    {
        return await noteService.GetNotesAsync(UserId, UserEmail, limit, offset);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NoteResponse>> Get(string id)
    {
        var note = await noteService.GetNoteAsync(id, UserId, UserEmail);
        if (note == null) return NotFound();
        return note;
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<NoteResponse>>> Search([FromQuery] string? q)
    {
        if (q?.Length > 200)
            return Problem(detail: "Search query must not exceed 200 characters.", statusCode: 400);

        return await noteService.SearchNotesAsync(UserId, UserEmail, q ?? "");
    }

    [HttpPost]
    public async Task<ActionResult<NoteResponse>> Create([FromBody] CreateNoteRequest request)
    {
        var created = await noteService.CreateNoteAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteResponse>> Update(string id, [FromBody] UpdateNoteRequest request)
    {
        var note = await noteService.UpdateNoteAsync(id, UserId, request);
        if (note == null) return NotFound();
        return note;
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

    [HttpPost("{id}/share")]
    public async Task<ActionResult<NoteResponse>> Share(string id, [FromBody] ShareNoteRequest request)
    {
        var note = await noteService.ShareNoteAsync(id, UserId, request.Email, request.Permission);
        if (note == null) return NotFound();
        return note;
    }

    [HttpDelete("{id}/share/{userId}")]
    public async Task<ActionResult<NoteResponse>> RemoveShare(string id, string userId)
    {
        var note = await noteService.RemoveShareAsync(id, UserId, userId);
        if (note == null) return NotFound();
        return note;
    }
}
