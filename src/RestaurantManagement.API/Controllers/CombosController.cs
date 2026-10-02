using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Modifiers;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/combos")]
[Authorize]
public sealed class CombosController(IModifierComboService service, IValidator<CreateComboRequest> createValidator, IValidator<UpdateComboRequest> updateValidator) : ControllerBase
{
    [HttpGet, RequirePermission("combo.read")] public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await service.GetCombosAsync(ct));
    [HttpGet("{id:guid}"), RequirePermission("combo.read")] public async Task<IActionResult> Get(Guid id, CancellationToken ct) => (await service.GetComboAsync(id, ct)) is { } result ? Ok(result) : NotFound();
    [HttpPost, RequirePermission("combo.create")] public async Task<IActionResult> Create(CreateComboRequest request, CancellationToken ct) { var v = await createValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.CreateComboAsync(request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:guid}"), RequirePermission("combo.update")] public async Task<IActionResult> Update(Guid id, UpdateComboRequest request, CancellationToken ct) { var v = await updateValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.UpdateComboAsync(id, request, ct); return result is null ? NotFound() : Ok(result); }
    [HttpPatch("{id:guid}/status"), RequirePermission("combo.manage")] public async Task<IActionResult> SetStatus(Guid id, RestaurantManagement.Application.Features.Branches.SetStatusRequest request, CancellationToken ct) => await service.SetComboStatusAsync(id, request.IsActive, ct) ? NoContent() : NotFound();
    [HttpPut("{id:guid}/items"), RequirePermission("combo.update")] public async Task<IActionResult> ReplaceItems(Guid id, ComboItemUpdateRequest request, CancellationToken ct) => (await service.ReplaceComboItemsAsync(id, request, ct)) is { } result ? Ok(result) : NotFound();
}