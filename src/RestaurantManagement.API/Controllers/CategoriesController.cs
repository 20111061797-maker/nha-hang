using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public sealed class CategoriesController(IMenuManagementService service, IValidator<CreateCategoryRequest> createValidator, IValidator<UpdateCategoryRequest> updateValidator) : ControllerBase
{
    [HttpGet, RequirePermission("category.read")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => Ok(await service.GetCategoriesAsync(cancellationToken));

    [HttpGet("{id:guid}"), RequirePermission("category.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetCategoryAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPost, RequirePermission("category.create")]
    public async Task<IActionResult> Create(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateCategoryAsync(request, cancellationToken); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}"), RequirePermission("category.update")]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateCategoryAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/status"), RequirePermission("category.manage")]
    public async Task<IActionResult> SetStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetCategoryStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("{id:guid}"), RequirePermission("category.manage")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) => await service.DeleteCategoryAsync(id, cancellationToken) ? NoContent() : NotFound();
}
