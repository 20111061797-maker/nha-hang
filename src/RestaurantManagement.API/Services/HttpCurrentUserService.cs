using System.Security.Claims;
using RestaurantManagement.Application.Common.Interfaces;

namespace RestaurantManagement.API.Services;

public sealed class HttpCurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public Guid? UserId => Guid.TryParse(User?.FindFirstValue("user_id") ?? User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
        ? userId
        : null;

    public string? Username => User?.FindFirstValue(ClaimTypes.Name) ?? User?.FindFirstValue(ClaimTypes.Email);

    public IReadOnlyCollection<string> Roles => User?.FindAll(ClaimTypes.Role).Select(x => x.Value).Distinct().ToArray() ?? [];

    public IReadOnlyCollection<string> Permissions => User?.FindAll("permission").Select(x => x.Value).Distinct().ToArray() ?? [];

    public Guid? BranchId => Guid.TryParse(User?.FindFirstValue("branch_id"), out var branchId) ? branchId : null;

    public bool IsAdministrator => User?.IsInRole("Admin") == true;

    public string? IpAddress
    {
        get
        {
            var ctx = httpContextAccessor.HttpContext;
            if (ctx is null) return null;

            if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && !string.IsNullOrWhiteSpace(forwarded))
            {
                var first = forwarded.ToString().Split(',')[0].Trim();
                if (!string.IsNullOrWhiteSpace(first)) return first;
            }

            if (ctx.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
            {
                return realIp.ToString().Trim();
            }

            return ctx.Connection.RemoteIpAddress?.ToString();
        }
    }
}