using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Authorize]
public sealed class TablesController(IBranchManagementService service, IValidator<CreateTableRequest> createValidator, IValidator<UpdateTableRequest> updateValidator, IValidator<ChangeTableStatusRequest> statusValidator) : ControllerBase
{
    [HttpGet("api/branches/{branchId:guid}/tables")]
    [RequirePermission("table.read")]
    public async Task<IActionResult> GetForBranch(Guid branchId, CancellationToken cancellationToken) => Ok(await service.GetTablesAsync(branchId, cancellationToken));

    [HttpPost("api/branches/{branchId:guid}/tables")]
    [RequirePermission("table.create")]
    public async Task<IActionResult> Create(Guid branchId, CreateTableRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateTableAsync(branchId, request, cancellationToken); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("api/tables/{id:guid}")]
    [RequirePermission("table.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetTableAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPut("api/tables/{id:guid}")]
    [RequirePermission("table.update")]
    public async Task<IActionResult> Update(Guid id, UpdateTableRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateTableAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("api/tables/{id:guid}/status")]
    [RequirePermission("table.change_status")]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeTableStatusRequest request, CancellationToken cancellationToken)
    {
        var validation = await statusValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.ChangeTableStatusAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("api/tables/{id:guid}/active-status")]
    [RequirePermission("table.manage")]
    public async Task<IActionResult> SetActiveStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetTableStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("api/tables/{id:guid}")]
    [RequirePermission("table.manage")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await service.DeleteTableAsync(id, cancellationToken) ? NoContent() : NotFound();
}