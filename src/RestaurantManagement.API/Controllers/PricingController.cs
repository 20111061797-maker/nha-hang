using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Pricing;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/pricing")]
[Authorize]
public sealed class PricingController(IProductPricingService pricingService) : ControllerBase
{
    [HttpPost("product"), RequirePermission("menu.read")]
    public async Task<IActionResult> Calculate(ProductPricingRequest request, CancellationToken ct) => Ok(await pricingService.CalculateAsync(request, ct));
}