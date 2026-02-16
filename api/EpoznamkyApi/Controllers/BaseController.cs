using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EpoznamkyApi.Controllers;

public abstract class BaseController : ControllerBase
{
    protected string UserId
    {
        get
        {
            // Try to get user ID from JWT token (Keycloak 'sub' claim)
            // With JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear(), 'sub' is preserved as-is
            var sub = User.FindFirstValue("sub")
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrEmpty(sub))
                return sub;

            // Fallback to header for development/testing ONLY
            if (HttpContext.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() == true)
            {
                var headerUserId = Request.Headers["X-User-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(headerUserId))
                    return headerUserId;
            }

            return "anonymous";
        }
    }

    protected string UserEmail => User.FindFirstValue(ClaimTypes.Email)
                                ?? User.FindFirstValue("email")
                                ?? "";

    protected string UserName => User.FindFirstValue(ClaimTypes.Name)
                               ?? User.FindFirstValue("preferred_username")
                               ?? "";
}
