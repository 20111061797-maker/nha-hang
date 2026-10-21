namespace RestaurantManagement.Application.Features.Recipes;

public sealed record RecipeItemDto(
    Guid Id,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    Guid UnitId,
    string UnitCode,
    string UnitName,
    decimal Quantity,
    decimal WastePercentage,
    decimal EffectiveQuantity);

public sealed record RecipeDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    Guid? ProductVariantId,
    string? VariantName,
    string Name,
    bool IsActive,
    int VersionNumber,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<RecipeItemDto> Items);

public sealed record SaveRecipeItemRequest(
    Guid IngredientId,
    Guid? UnitId,
    string? UnitName,
    decimal Quantity,
    decimal WastePercentage = 0);

public sealed record SaveRecipeRequest(
    Guid ProductId,
    Guid? ProductVariantId,
    string? Name,
    IReadOnlyList<SaveRecipeItemRequest> Items);

public sealed record ProductStockCheckItemDto(
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    decimal RequiredQuantity,
    string RequiredUnitName,
    decimal ConvertedStockQuantity,
    string StockUnitName,
    decimal CurrentStock,
    bool IsSufficient);

public sealed record ProductStockCheckResponse(
    Guid ProductId,
    string ProductName,
    decimal OrderQuantity,
    bool HasRecipe,
    bool AllIngredientsAvailable,
    IReadOnlyList<ProductStockCheckItemDto> Ingredients);

public sealed record RecordWasteRequest(
    Guid BranchId,
    Guid? KitchenOrderId,
    Guid? ProductId,
    Guid? IngredientId,
    decimal Quantity,
    string Reason);

public sealed record RecordReCookRequest(
    Guid KitchenOrderId,
    Guid KitchenOrderItemId,
    string Reason);

public sealed record InventoryDeductionResult(
    bool Success,
    int ItemsProcessed,
    int TransactionsCreated,
    IReadOnlyList<string> DeductedItems,
    IReadOnlyList<string> Warnings);
