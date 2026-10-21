using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Recipes;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/recipes")]
[Authorize]
public sealed class RecipeController(IRecipeService recipeService) : ControllerBase
{
    [HttpGet]
    [RequirePermission("product.read")]
    public async Task<IActionResult> GetRecipes(CancellationToken ct)
    {
        return Ok(await recipeService.GetRecipesAsync(ct));
    }

    [HttpGet("product/{productId:guid}")]
    [RequirePermission("product.read")]
    public async Task<IActionResult> GetByProduct(Guid productId, [FromQuery] Guid? variantId, CancellationToken ct)
    {
        var recipe = await recipeService.GetByProductAsync(productId, variantId, ct);
        if (recipe == null)
            return NotFound(new { message = "Chưa có công thức nguyên liệu cho món này." });

        return Ok(recipe);
    }

    [HttpPost]
    [RequirePermission("product.update")]
    public async Task<IActionResult> SaveRecipe([FromBody] SaveRecipeRequest request, CancellationToken ct)
    {
        if (request.ProductId == Guid.Empty)
            return BadRequest(new { message = "ProductId là bắt buộc." });

        if (request.Items == null || request.Items.Count == 0)
            return BadRequest(new { message = "Công thức cần ít nhất một nguyên liệu." });

        var recipe = await recipeService.SaveRecipeAsync(request, ct);
        return Ok(recipe);
    }

    [HttpGet("check-stock")]
    [RequirePermission("inventory.read")]
    public async Task<IActionResult> CheckStock(
        [FromQuery] Guid branchId,
        [FromQuery] Guid productId,
        [FromQuery] Guid? variantId,
        [FromQuery] decimal quantity = 1,
        CancellationToken ct = default)
    {
        if (branchId == Guid.Empty || productId == Guid.Empty)
            return BadRequest(new { message = "BranchId và ProductId là bắt buộc." });

        var result = await recipeService.CheckStockForProductAsync(branchId, productId, variantId, quantity, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission("product.delete")]
    public async Task<IActionResult> DeleteRecipe(Guid id, CancellationToken ct)
    {
        var deleted = await recipeService.DeleteRecipeAsync(id, ct);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
