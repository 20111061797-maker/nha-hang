using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Branches;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/tables")]
public sealed class PublicTablesController(IBranchManagementService service) : ControllerBase
{
    [HttpGet("{qrCodeIdentifier}")]
    public async Task<IActionResult> Get(string qrCodeIdentifier, CancellationToken cancellationToken) => (await service.GetPublicTableAsync(qrCodeIdentifier, cancellationToken)) is { } result ? Ok(result) : NotFound();
}