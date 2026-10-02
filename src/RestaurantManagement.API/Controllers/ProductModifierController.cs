using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Modifiers;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/products/{productId:guid}/modifier-groups")]
[Authorize]
public sealed class ProductModifierController(IModifierComboService service) : ControllerBase
{
    [HttpGet, RequirePermission("product.modifier.read")]
    public async Task<IActionResult> Get(Guid productId, CancellationToken ct) => Ok(await service.GetProductModifierGroupsAsync(productId, ct));

    [HttpPut, RequirePermission("product.modifier.update")]
    public async Task<IActionResult> Replace(Guid productId, AssignModifierGroupsRequest request, CancellationToken ct) => Ok(await service.AssignProductModifierGroupsAsync(productId, request, ct));
}