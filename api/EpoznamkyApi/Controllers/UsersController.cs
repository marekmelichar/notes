using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController(DataService dataService) : BaseController
{
    [HttpGet("me")]
    public ActionResult<object> GetCurrentUser()
    {
        var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
        return Ok(new
        {
            UserId,
            UserEmail,
            UserName,
            IsAuthenticated = User.Identity?.IsAuthenticated,
            AuthenticationType = User.Identity?.AuthenticationType,
            Claims = claims
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> Get(string id)
    {
        var user = await dataService.GetUserAsync(id);
        if (user == null) return NotFound();
        return user;
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<User>>> Search([FromQuery] string email)
    {
        return await dataService.SearchUsersAsync(email ?? "");
    }
}
