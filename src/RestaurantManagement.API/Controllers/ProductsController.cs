using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public sealed class ProductsController(
    IMenuManagementService service,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator,
    IValidator<CreateVariantRequest> createVariantValidator,
    IValidator<UpdateVariantRequest> updateVariantValidator,
    IValidator<CreateProductImageRequest> createImageValidator,
    IValidator<UpdateProductImageRequest> updateImageValidator) : ControllerBase
{
    [HttpGet, RequirePermission("product.read")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => Ok(await service.GetProductsAsync(cancellationToken));

    [HttpGet("{id:guid}"), RequirePermission("product.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken) => (await service.GetProductAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPost, RequirePermission("product.create")]
    public async Task<IActionResult> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateProductAsync(request, cancellationToken); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}"), RequirePermission("product.update")]
    public async Task<IActionResult> Update(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateProductAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/status"), RequirePermission("product.manage")]
    public async Task<IActionResult> SetStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetProductStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/categories"), RequirePermission("product.update")]
    public async Task<IActionResult> AssignCategories(Guid id, AssignCategoriesRequest request, CancellationToken cancellationToken) => (await service.AssignCategoriesAsync(id, request, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpGet("{productId:guid}/variants"), RequirePermission("product.variant.read")]
    public async Task<IActionResult> GetVariants(Guid productId, CancellationToken cancellationToken) => Ok(await service.GetVariantsAsync(productId, cancellationToken));

    [HttpPost("{productId:guid}/variants"), RequirePermission("product.variant.create")]
    public async Task<IActionResult> CreateVariant(Guid productId, CreateVariantRequest request, CancellationToken cancellationToken)
    {
        var validation = await createVariantValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateVariantAsync(productId, request, cancellationToken); return CreatedAtAction(nameof(GetVariant), new { id = result.Id }, result);
    }

    [HttpGet("{productId:guid}/images"), RequirePermission("product.image.read")]
    public async Task<IActionResult> GetImages(Guid productId, CancellationToken cancellationToken) => Ok(await service.GetImagesAsync(productId, cancellationToken));

    [HttpPost("{productId:guid}/images"), RequirePermission("product.image.create")]
    public async Task<IActionResult> CreateImage(Guid productId, CreateProductImageRequest request, CancellationToken cancellationToken)
    {
        var validation = await createImageValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateImageAsync(productId, request, cancellationToken); return CreatedAtAction(nameof(GetImages), new { productId }, result);
    }

    [HttpGet("/api/product-variants/{id:guid}"), RequirePermission("product.variant.read")]
    public async Task<IActionResult> GetVariant(Guid id, CancellationToken cancellationToken) => (await service.GetVariantAsync(id, cancellationToken)) is { } result ? Ok(result) : NotFound();

    [HttpPut("/api/product-variants/{id:guid}"), RequirePermission("product.variant.update")]
    public async Task<IActionResult> UpdateVariant(Guid id, UpdateVariantRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateVariantValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateVariantAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("/api/product-variants/{id:guid}/status"), RequirePermission("product.variant.manage")]
    public async Task<IActionResult> SetVariantStatus(Guid id, SetStatusRequest request, CancellationToken cancellationToken) => await service.SetVariantStatusAsync(id, request.IsActive, cancellationToken) ? NoContent() : NotFound();

    [HttpPut("/api/product-images/{id:guid}"), RequirePermission("product.image.update")]
    public async Task<IActionResult> UpdateImage(Guid id, UpdateProductImageRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateImageValidator.ValidateAsync(request, cancellationToken); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateImageAsync(id, request, cancellationToken); return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("/api/product-images/{id:guid}"), RequirePermission("product.image.manage")]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken cancellationToken) => await service.DeleteImageAsync(id, cancellationToken) ? NoContent() : NotFound();
}