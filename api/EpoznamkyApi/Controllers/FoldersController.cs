using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FoldersController(FolderService folderService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<List<FolderResponse>>> GetAll()
    {
        return await folderService.GetFoldersAsync(UserId);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FolderResponse>> Get(string id)
    {
        var folder = await folderService.GetFolderAsync(id, UserId);
        if (folder == null) return NotFound();
        return folder;
    }

    [HttpPost]
    public async Task<ActionResult<FolderResponse>> Create([FromBody] CreateFolderRequest request)
    {
        var created = await folderService.CreateFolderAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FolderResponse>> Update(string id, [FromBody] UpdateFolderRequest request)
    {
        if (request.ParentId != null && request.ParentId != "" &&
            await folderService.WouldCreateCircularReferenceAsync(id, request.ParentId, UserId))
        {
            return Problem(detail: "Circular reference detected.", statusCode: 400);
        }

        var folder = await folderService.UpdateFolderAsync(id, UserId, request);
        if (folder == null) return NotFound();
        return folder;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        if (!await folderService.DeleteFolderAsync(id, UserId)) return NotFound();
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<ActionResult> Reorder([FromBody] ReorderFoldersRequest request)
    {
        await folderService.ReorderFoldersAsync(UserId, request.Items);
        return NoContent();
    }
}
