using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController(DataService dataService, ILogger<UsersController> logger) : BaseController
{
    [HttpGet("me")]
    public ActionResult<object> GetCurrentUser()
    {
        return Ok(new
        {
            UserId,
            UserEmail,
            UserName
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> Get(string id)
    {
        // Scope to users who share notes with the requester
        var user = await dataService.GetUserIfRelatedAsync(id, UserId, UserEmail);
        if (user == null) return NotFound();
        return user;
    }

    [HttpGet("search")]
    [EnableRateLimiting("user-search")]
    public async Task<ActionResult<List<User>>> Search([FromQuery] string email)
    {
        if (email?.Length > 320)
            return BadRequest("Email search query must not exceed 320 characters.");

        var results = await dataService.SearchUsersAsync(email ?? "");
        logger.LogDebug("User search for '{Email}' returned {Count} results", email, results.Count);
        return results;
    }
}
