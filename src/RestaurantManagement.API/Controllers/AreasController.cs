using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Authorize]
public sealed class AreasController(IBranchManagementService service, IValidator<CreateAreaRequest> createValidator, IValidator<UpdateAreaRequest> updateValidator) : ControllerBase
{
    [HttpGet("api/branches/{branchId:guid}/areas")]
    [RequirePermission("area.read")]
    public async Task<IActionResult> GetForBranch(Guid branchId, CancellationToken cancellationToken) => Ok(await service.GetAreasAsync(branchId, cancellationToken));

    [HttpPost("api/branches/{branchId:guid}/areas")]
    [RequirePermission("area.create")]
    public async Task<IActionResult> Create(Guid branchId, CreateAreaRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateAreaAsync(branchId, request, cancellationToken); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("api/areas/{id:guid}")]
    [RequirePermission("area.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetAreaAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPut("api/areas/{id:guid}")]
    [RequirePermission("area.update")]
    public async Task<IActionResult> Update(Guid id, UpdateAreaRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateAreaAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("api/areas/{id:guid}/status")]
    [RequirePermission("area.manage")]
    public async Task<IActionResult> SetStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetAreaStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();
}