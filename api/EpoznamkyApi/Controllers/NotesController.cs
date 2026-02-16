using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class NotesController(DataService dataService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<List<Note>>> GetAll()
    {
        return await dataService.GetNotesAsync(UserId, UserEmail);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Note>> Get(string id)
    {
        var note = await dataService.GetNoteAsync(id, UserId, UserEmail);
        if (note == null) return NotFound();
        return note;
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<Note>>> Search([FromQuery] string? q)
    {
        if (q?.Length > 200)
            return BadRequest("Search query must not exceed 200 characters.");

        return await dataService.SearchNotesAsync(UserId, UserEmail, q ?? "");
    }

    [HttpPost]
    public async Task<ActionResult<Note>> Create([FromBody] CreateNoteRequest request)
    {
        var note = new Note
        {
            Title = request.Title,
            Content = request.Content,
            FolderId = request.FolderId,
            IsPinned = request.IsPinned,
            UserId = UserId
        };
        var created = await dataService.CreateNoteAsync(note, request.Tags);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Note>> Update(string id, [FromBody] UpdateNoteRequest request)
    {
        var note = await dataService.UpdateNoteAsync(id, UserId, n =>
        {
            if (request.Title != null) n.Title = request.Title;
            if (request.Content != null) n.Content = request.Content;
            // FolderId: null means "don't change", empty string means "remove from folder"
            if (request.FolderId != null)
            {
                n.FolderId = request.FolderId == "" ? null : request.FolderId;
            }
            if (request.IsPinned.HasValue) n.IsPinned = request.IsPinned.Value;
            if (request.Order.HasValue) n.Order = request.Order.Value;
        }, request.Tags);

        if (note == null) return NotFound();
        return note;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var note = await dataService.UpdateNoteAsync(id, UserId, n =>
        {
            n.IsDeleted = true;
            n.DeletedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        });
        if (note == null) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}/permanent")]
    public async Task<ActionResult> DeletePermanent(string id)
    {
        if (!await dataService.DeleteNoteAsync(id, UserId)) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<Note>> Restore(string id)
    {
        var note = await dataService.UpdateNoteAsync(id, UserId, n =>
        {
            n.IsDeleted = false;
            n.DeletedAt = null;
        });
        if (note == null) return NotFound();
        return note;
    }

    [HttpPost("reorder")]
    public async Task<ActionResult> Reorder([FromBody] ReorderNotesRequest request)
    {
        foreach (var item in request.Items)
        {
            await dataService.UpdateNoteAsync(item.Id, UserId, n => n.Order = item.Order);
        }
        return NoContent();
    }

    [HttpPost("{id}/share")]
    public async Task<ActionResult<Note>> Share(string id, [FromBody] ShareNoteRequest request)
    {
        var note = await dataService.ShareNoteAsync(id, UserId, request.Email, request.Permission);
        if (note == null) return NotFound();
        return note;
    }

    [HttpDelete("{id}/share/{userId}")]
    public async Task<ActionResult<Note>> RemoveShare(string id, string userId)
    {
        var note = await dataService.RemoveShareAsync(id, UserId, userId);
        if (note == null) return NotFound();
        return note;
    }
}
