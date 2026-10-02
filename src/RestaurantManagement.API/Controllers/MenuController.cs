using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/branches/{branchId:guid}/menu")]
[Authorize]
public sealed class MenuController(IMenuManagementService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission("menu.read")]
    public async Task<IActionResult> Get(Guid branchId, CancellationToken cancellationToken) => Ok(await service.GetMenuAsync(branchId, cancellationToken));
}