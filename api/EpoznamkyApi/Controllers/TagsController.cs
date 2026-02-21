using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class TagsController(TagService tagService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<List<TagResponse>>> GetAll()
    {
        return await tagService.GetTagsAsync(UserId);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TagResponse>> Get(string id)
    {
        var tag = await tagService.GetTagAsync(id, UserId);
        if (tag == null) return NotFound();
        return tag;
    }

    [HttpPost]
    public async Task<ActionResult<TagResponse>> Create([FromBody] CreateTagRequest request)
    {
        var created = await tagService.CreateTagAsync(request, UserId);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TagResponse>> Update(string id, [FromBody] UpdateTagRequest request)
    {
        var tag = await tagService.UpdateTagAsync(id, UserId, request);
        if (tag == null) return NotFound();
        return tag;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        if (!await tagService.DeleteTagAsync(id, UserId)) return NotFound();
        return NoContent();
    }
}
