using EpoznamkyApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EpoznamkyApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UsersController : BaseController
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
}
