using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/branches")]
[Authorize]
public sealed class BranchesController(IBranchManagementService service, IValidator<CreateBranchRequest> createValidator, IValidator<UpdateBranchRequest> updateValidator) : ControllerBase
{
    [HttpGet]
    [RequirePermission("branch.read")]
    public async Task<ActionResult<IReadOnlyList<BranchListItem>>> GetAll(CancellationToken cancellationToken) => Ok(await service.GetBranchesAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    [RequirePermission("branch.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetBranchAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPost]
    [RequirePermission("branch.create")]
    public async Task<IActionResult> Create(CreateBranchRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateBranchAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission("branch.update")]
    public async Task<IActionResult> Update(Guid id, UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateBranchAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [RequirePermission("branch.manage")]
    public async Task<IActionResult> SetStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetBranchStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();
}