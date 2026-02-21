using EpoznamkyApi.Models;
using EpoznamkyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController(UserService userService, ILogger<UsersController> logger) : BaseController
{
    [HttpGet("me")]
    public ActionResult<UserInfoResponse> GetCurrentUser()
    {
        return Ok(new UserInfoResponse
        {
            UserId = UserId,
            UserEmail = UserEmail,
            UserName = UserName
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> Get(string id)
    {
        var user = await userService.GetUserIfRelatedAsync(id, UserId, UserEmail);
        if (user == null) return NotFound();
        return user;
    }

    [HttpGet("search")]
    [EnableRateLimiting("user-search")]
    public async Task<ActionResult<List<User>>> Search([FromQuery] string email)
    {
        if (email?.Length > 320)
            return Problem(detail: "Email search query must not exceed 320 characters.", statusCode: 400);

        var results = await userService.SearchUsersAsync(email ?? "", UserId, UserEmail);
        logger.LogDebug("User search for '{Email}' returned {Count} results", email, results.Count);
        return results;
    }
}
