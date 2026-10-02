using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Authorize]
public sealed class BranchProductsController(IMenuManagementService service, IValidator<CreateBranchProductRequest> createValidator, IValidator<UpdateBranchProductRequest> updateValidator) : ControllerBase
{
    [HttpGet("api/branches/{branchId:guid}/products"), RequirePermission("branch.product.read")]
    public async Task<IActionResult> GetForBranch(Guid branchId, CancellationToken cancellationToken) => Ok(await service.GetBranchProductsAsync(branchId, cancellationToken));

    [HttpPost("api/branches/{branchId:guid}/products"), RequirePermission("branch.product.create")]
    public async Task<IActionResult> Create(Guid branchId, CreateBranchProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateBranchProductAsync(branchId, request, cancellationToken); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("api/branch-products/{id:guid}"), RequirePermission("branch.product.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetBranchProductAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPut("api/branch-products/{id:guid}"), RequirePermission("branch.product.update")]
    public async Task<IActionResult> Update(Guid id, UpdateBranchProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateBranchProductAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("api/branch-products/{id:guid}/status"), RequirePermission("branch.product.manage")]
    public async Task<IActionResult> SetStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetBranchProductStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();

    [HttpPatch("api/branch-products/{id:guid}/availability"), RequirePermission("branch.product.manage")]
    public async Task<IActionResult> SetAvailability(Guid id, AvailabilityRequest request, CancellationToken cancellationToken) => (await service.SetBranchProductAvailabilityAsync(id, request.IsAvailable, cancellationToken)) is { } result ? Ok(result) : NotFound();
}