namespace RestaurantManagement.Application.Features.Recipes;

public interface IRecipeService
{
    Task<RecipeDto?> GetByProductAsync(Guid productId, Guid? variantId, CancellationToken cancellationToken = default);
    Task<RecipeDto> SaveRecipeAsync(SaveRecipeRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecipeDto>> GetRecipesAsync(CancellationToken cancellationToken = default);
    Task<ProductStockCheckResponse> CheckStockForProductAsync(Guid branchId, Guid productId, Guid? variantId, decimal quantity, CancellationToken cancellationToken = default);
    Task<bool> DeleteRecipeAsync(Guid recipeId, CancellationToken cancellationToken = default);
}
