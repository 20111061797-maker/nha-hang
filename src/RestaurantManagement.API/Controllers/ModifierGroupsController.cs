using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Modifiers;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/modifier-groups")]
[Authorize]
public sealed class ModifierGroupsController(IModifierComboService service, IValidator<CreateModifierGroupRequest> createValidator, IValidator<UpdateModifierGroupRequest> updateValidator, IValidator<CreateModifierRequest> modifierValidator, IValidator<UpdateModifierRequest> modifierUpdateValidator) : ControllerBase
{
    [HttpGet, RequirePermission("modifier.group.read")] public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await service.GetModifierGroupsAsync(ct));
    [HttpGet("{id:guid}"), RequirePermission("modifier.group.read")] public async Task<IActionResult> Get(Guid id, CancellationToken ct) => (await service.GetModifierGroupAsync(id, ct)) is { } result ? Ok(result) : NotFound();
    [HttpPost, RequirePermission("modifier.group.create")] public async Task<IActionResult> Create(CreateModifierGroupRequest request, CancellationToken ct) { var v = await createValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.CreateModifierGroupAsync(request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:guid}"), RequirePermission("modifier.group.update")] public async Task<IActionResult> Update(Guid id, UpdateModifierGroupRequest request, CancellationToken ct) { var v = await updateValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.UpdateModifierGroupAsync(id, request, ct); return result is null ? NotFound() : Ok(result); }
    [HttpPatch("{id:guid}/status"), RequirePermission("modifier.group.manage")] public async Task<IActionResult> SetStatus(Guid id, RestaurantManagement.Application.Features.Branches.SetStatusRequest request, CancellationToken ct) => await service.SetModifierGroupStatusAsync(id, request.IsActive, ct) ? NoContent() : NotFound();
    [HttpGet("{groupId:guid}/modifiers"), RequirePermission("modifier.read")] public async Task<IActionResult> GetModifiers(Guid groupId, CancellationToken ct) => Ok(await service.GetModifiersAsync(groupId, ct));
    [HttpPost("{groupId:guid}/modifiers"), RequirePermission("modifier.create")] public async Task<IActionResult> CreateModifier(Guid groupId, CreateModifierRequest request, CancellationToken ct) { var v = await modifierValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.CreateModifierAsync(groupId, request, ct); return CreatedAtAction(nameof(GetModifier), new { id = result.Id }, result); }
    [HttpGet("/api/modifiers/{id:guid}"), RequirePermission("modifier.read")] public async Task<IActionResult> GetModifier(Guid id, CancellationToken ct) => (await service.GetModifierAsync(id, ct)) is { } result ? Ok(result) : NotFound();
    [HttpPut("/api/modifiers/{id:guid}"), RequirePermission("modifier.update")] public async Task<IActionResult> UpdateModifier(Guid id, UpdateModifierRequest request, CancellationToken ct) { var v = await modifierUpdateValidator.ValidateAsync(request, ct); if (!v.IsValid) return BadRequest(new ValidationProblemDetails(v.ToDictionary())); var result = await service.UpdateModifierAsync(id, request, ct); return result is null ? NotFound() : Ok(result); }
    [HttpPatch("/api/modifiers/{id:guid}/status"), RequirePermission("modifier.manage")] public async Task<IActionResult> SetModifierStatus(Guid id, RestaurantManagement.Application.Features.Branches.SetStatusRequest request, CancellationToken ct) => await service.SetModifierStatusAsync(id, request.IsActive, ct) ? NoContent() : NotFound();
}