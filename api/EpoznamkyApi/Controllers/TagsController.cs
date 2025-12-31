using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class TagsController(DataService dataService) : BaseController
{

    [HttpGet]
    public async Task<ActionResult<List<Tag>>> GetAll()
    {
        return await dataService.GetTagsAsync(UserId);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Tag>> Get(string id)
    {
        var tag = await dataService.GetTagAsync(id, UserId);
        if (tag == null) return NotFound();
        return tag;
    }

    [HttpPost]
    public async Task<ActionResult<Tag>> Create([FromBody] CreateTagRequest request)
    {
        var tag = new Tag
        {
            Name = request.Name,
            Color = request.Color,
            UserId = UserId
        };
        var created = await dataService.CreateTagAsync(tag);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Tag>> Update(string id, [FromBody] UpdateTagRequest request)
    {
        var tag = await dataService.UpdateTagAsync(id, UserId, t =>
        {
            if (request.Name != null) t.Name = request.Name;
            if (request.Color != null) t.Color = request.Color;
        });
        if (tag == null) return NotFound();
        return tag;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        if (!await dataService.DeleteTagAsync(id, UserId)) return NotFound();
        return NoContent();
    }
}
