using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FoldersController(DataService dataService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<List<Folder>>> GetAll()
    {
        return await dataService.GetFoldersAsync(UserId);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Folder>> Get(string id)
    {
        var folder = await dataService.GetFolderAsync(id, UserId);
        if (folder == null) return NotFound();
        return folder;
    }

    [HttpPost]
    public async Task<ActionResult<Folder>> Create([FromBody] CreateFolderRequest request)
    {
        var folder = new Folder
        {
            Name = request.Name,
            ParentId = request.ParentId,
            Color = request.Color,
            UserId = UserId
        };
        var created = await dataService.CreateFolderAsync(folder);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Folder>> Update(string id, [FromBody] UpdateFolderRequest request)
    {
        // Prevent circular references
        if (request.ParentId == id)
            return BadRequest("A folder cannot be its own parent.");

        if (request.ParentId != null)
        {
            var visited = new HashSet<string> { id };
            var currentParentId = request.ParentId;

            while (!string.IsNullOrEmpty(currentParentId))
            {
                if (!visited.Add(currentParentId))
                    return BadRequest("Circular reference detected.");

                var parent = await dataService.GetFolderAsync(currentParentId, UserId);
                if (parent == null) break;
                currentParentId = parent.ParentId;
            }
        }

        var folder = await dataService.UpdateFolderAsync(id, UserId, f =>
        {
            if (request.Name != null) f.Name = request.Name;
            // ParentId: null means "don't change", empty string means "move to root"
            if (request.ParentId != null) f.ParentId = request.ParentId == "" ? null : request.ParentId;
            if (request.Color != null) f.Color = request.Color;
            if (request.Order.HasValue) f.Order = request.Order.Value;
        });
        if (folder == null) return NotFound();
        return folder;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        if (!await dataService.DeleteFolderAsync(id, UserId)) return NotFound();
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<ActionResult> Reorder([FromBody] ReorderFoldersRequest request)
    {
        foreach (var item in request.Items)
        {
            await dataService.UpdateFolderAsync(item.Id, UserId, f => f.Order = item.Order);
        }
        return NoContent();
    }
}
