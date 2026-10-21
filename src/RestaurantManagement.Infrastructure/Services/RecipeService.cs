using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Recipes;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Common;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class RecipeService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IRecipeService
{
    public async Task<RecipeDto?> GetByProductAsync(Guid productId, Guid? variantId, CancellationToken cancellationToken = default)
    {
        var product = await dbContext.Products.FindAsync([productId], cancellationToken);
        if (product == null) return null;

        var recipe = await dbContext.Recipes
            .Where(r => r.ProductId == productId && r.IsActive)
            .Where(r => variantId.HasValue ? r.ProductVariantId == variantId : r.ProductVariantId == null)
            .FirstOrDefaultAsync(cancellationToken);

        // Fallback to base product recipe if specific variant recipe is not defined
        if (recipe == null && variantId.HasValue)
        {
            recipe = await dbContext.Recipes
                .Where(r => r.ProductId == productId && r.ProductVariantId == null && r.IsActive)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (recipe == null) return null;

        var activeVersion = await dbContext.RecipeVersions
            .Where(v => v.RecipeId == recipe.Id && v.IsActive)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeVersion == null) return null;

        var itemsQuery = from item in dbContext.RecipeItems
                         where item.RecipeVersionId == activeVersion.Id
                         join ing in dbContext.Ingredients on item.IngredientId equals ing.Id
                         join u in dbContext.Units on item.UnitId equals u.Id
                         select new RecipeItemDto(
                             item.Id,
                             item.IngredientId,
                             ing.Code,
                             ing.Name,
                             item.UnitId,
                             u.Code,
                             u.Name,
                             item.Quantity,
                             item.WastePercentage,
                             Math.Round(item.Quantity * (1 + item.WastePercentage / 100m), 4)
                         );

        var items = await itemsQuery.ToListAsync(cancellationToken);
        string? variantName = null;
        if (recipe.ProductVariantId.HasValue)
        {
            variantName = await dbContext.ProductVariants
                .Where(v => v.Id == recipe.ProductVariantId.Value)
                .Select(v => v.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new RecipeDto(
            recipe.Id,
            recipe.ProductId,
            product.Name,
            recipe.ProductVariantId,
            variantName,
            recipe.Name,
            recipe.IsActive,
            activeVersion.VersionNumber,
            activeVersion.EffectiveFrom,
            activeVersion.UpdatedAt,
            items
        );
    }

    public async Task<RecipeDto> SaveRecipeAsync(SaveRecipeRequest request, CancellationToken cancellationToken = default)
    {
        var product = await dbContext.Products.FindAsync([request.ProductId], cancellationToken);
        if (product == null)
        {
            throw new ApplicationException("Món ăn không tồn tại.");
        }

        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ApplicationException("Công thức phải chứa ít nhất một nguyên liệu.");
        }

        foreach (var item in request.Items)
        {
            if (item.Quantity <= 0)
            {
                throw new ApplicationException("Định lượng nguyên liệu phải lớn hơn 0.");
            }
        }

        var recipe = await dbContext.Recipes
            .Where(r => r.ProductId == request.ProductId && r.ProductVariantId == request.ProductVariantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (recipe == null)
        {
            recipe = new Recipe
            {
                ProductId = request.ProductId,
                ProductVariantId = request.ProductVariantId,
                Name = string.IsNullOrWhiteSpace(request.Name) ? $"Công thức - {product.Name}" : request.Name.Trim(),
                IsActive = true
            };
            dbContext.Recipes.Add(recipe);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            recipe.IsActive = true;
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                recipe.Name = request.Name.Trim();
            }
        }

        // Archive current active versions
        var oldVersions = await dbContext.RecipeVersions
            .Where(v => v.RecipeId == recipe.Id && v.IsActive)
            .ToListAsync(cancellationToken);

        var nextVersionNumber = 1;
        var now = DateTimeOffset.UtcNow;

        if (oldVersions.Count > 0)
        {
            nextVersionNumber = oldVersions.Max(v => v.VersionNumber) + 1;
            foreach (var old in oldVersions)
            {
                old.IsActive = false;
                old.EffectiveTo = now;
            }
        }

        var newVersion = new RecipeVersion
        {
            RecipeId = recipe.Id,
            VersionNumber = nextVersionNumber,
            IsActive = true,
            EffectiveFrom = now
        };
        dbContext.RecipeVersions.Add(newVersion);
        await dbContext.SaveChangesAsync(cancellationToken);

        var resultItems = new List<RecipeItemDto>();

        foreach (var reqItem in request.Items)
        {
            var ing = await dbContext.Ingredients.FindAsync([reqItem.IngredientId], cancellationToken);
            if (ing == null)
            {
                throw new ApplicationException($"Nguyên liệu ID {reqItem.IngredientId} không tồn tại.");
            }

            Guid unitId;
            Unit? unit = null;

            if (reqItem.UnitId.HasValue && reqItem.UnitId.Value != Guid.Empty)
            {
                unit = await dbContext.Units.FindAsync([reqItem.UnitId.Value], cancellationToken);
                unitId = reqItem.UnitId.Value;
            }
            else if (!string.IsNullOrWhiteSpace(reqItem.UnitName))
            {
                var uName = reqItem.UnitName.Trim();
                unit = await dbContext.Units.FirstOrDefaultAsync(u => u.Name.ToLower() == uName.ToLower() || u.Code.ToLower() == uName.ToLower(), cancellationToken);
                if (unit == null)
                {
                    unit = new Unit
                    {
                        Code = uName.Length > 10 ? uName[..10].ToUpperInvariant() : uName.ToUpperInvariant(),
                        Name = uName,
                        ConversionFactor = 1m
                    };
                    dbContext.Units.Add(unit);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                unitId = unit.Id;
            }
            else
            {
                unitId = ing.BaseUnitId;
                unit = await dbContext.Units.FindAsync([unitId], cancellationToken);
            }

            var wastePct = Math.Max(0m, reqItem.WastePercentage);
            var recipeItem = new RecipeItem
            {
                RecipeVersionId = newVersion.Id,
                IngredientId = ing.Id,
                UnitId = unitId,
                Quantity = reqItem.Quantity,
                WastePercentage = wastePct
            };
            dbContext.RecipeItems.Add(recipeItem);

            var effectiveQty = Math.Round(reqItem.Quantity * (1 + wastePct / 100m), 4);
            resultItems.Add(new RecipeItemDto(
                recipeItem.Id,
                ing.Id,
                ing.Code,
                ing.Name,
                unitId,
                unit?.Code ?? "",
                unit?.Name ?? "",
                reqItem.Quantity,
                wastePct,
                effectiveQty
            ));
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditWriter.WriteAsync("RecipeSaved", nameof(Recipe), recipe.Id, currentUser.Username, null, cancellationToken);

        string? variantName = null;
        if (recipe.ProductVariantId.HasValue)
        {
            variantName = await dbContext.ProductVariants
                .Where(v => v.Id == recipe.ProductVariantId.Value)
                .Select(v => v.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new RecipeDto(
            recipe.Id,
            recipe.ProductId,
            product.Name,
            recipe.ProductVariantId,
            variantName,
            recipe.Name,
            recipe.IsActive,
            newVersion.VersionNumber,
            newVersion.EffectiveFrom,
            newVersion.UpdatedAt,
            resultItems
        );
    }

    public async Task<IReadOnlyList<RecipeDto>> GetRecipesAsync(CancellationToken cancellationToken = default)
    {
        var recipes = await dbContext.Recipes
            .Where(r => r.IsActive)
            .ToListAsync(cancellationToken);

        var list = new List<RecipeDto>();
        foreach (var r in recipes)
        {
            var dto = await GetByProductAsync(r.ProductId, r.ProductVariantId, cancellationToken);
            if (dto != null) list.Add(dto);
        }

        return list;
    }

    public async Task<ProductStockCheckResponse> CheckStockForProductAsync(Guid branchId, Guid productId, Guid? variantId, decimal quantity, CancellationToken cancellationToken = default)
    {
        var product = await dbContext.Products.FindAsync([productId], cancellationToken);
        var productName = product?.Name ?? "Món";

        var recipeDto = await GetByProductAsync(productId, variantId, cancellationToken);
        if (recipeDto == null || recipeDto.Items.Count == 0)
        {
            return new ProductStockCheckResponse(
                productId,
                productName,
                quantity,
                HasRecipe: false,
                AllIngredientsAvailable: false,
                Ingredients: []
            );
        }

        var warehouse = await dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.BranchId == branchId && w.IsActive, cancellationToken);

        var checkItems = new List<ProductStockCheckItemDto>();
        var allAvailable = true;

        foreach (var item in recipeDto.Items)
        {
            var requiredQuantity = item.EffectiveQuantity * quantity;

            decimal currentStock = 0m;
            string stockUnitName = item.UnitName;

            if (warehouse != null)
            {
                var invItem = await dbContext.InventoryItems
                    .FirstOrDefaultAsync(i => i.WarehouseId == warehouse.Id && i.IngredientId == item.IngredientId && i.IsActive, cancellationToken);

                if (invItem != null)
                {
                    var balance = await dbContext.InventoryBalances
                        .FirstOrDefaultAsync(b => b.InventoryItemId == invItem.Id, cancellationToken);

                    var invUnit = await dbContext.Units.FindAsync([invItem.UnitId], cancellationToken);
                    stockUnitName = invUnit?.Name ?? item.UnitName;
                    currentStock = balance?.Quantity ?? 0m;
                }
            }

            // Convert required quantity into stock unit for comparison
            var convertedRequired = UnitConversionHelper.ConvertQuantity(requiredQuantity, item.UnitName, stockUnitName);
            var isSufficient = currentStock >= convertedRequired;
            if (!isSufficient) allAvailable = false;

            checkItems.Add(new ProductStockCheckItemDto(
                item.IngredientId,
                item.IngredientCode,
                item.IngredientName,
                requiredQuantity,
                item.UnitName,
                convertedRequired,
                stockUnitName,
                currentStock,
                isSufficient
            ));
        }

        return new ProductStockCheckResponse(
            productId,
            productName,
            quantity,
            HasRecipe: true,
            AllIngredientsAvailable: allAvailable,
            Ingredients: checkItems
        );
    }

    public async Task<bool> DeleteRecipeAsync(Guid recipeId, CancellationToken cancellationToken = default)
    {
        var recipe = await dbContext.Recipes.FindAsync([recipeId], cancellationToken);
        if (recipe == null) return false;

        recipe.IsActive = false;

        var versions = await dbContext.RecipeVersions
            .Where(v => v.RecipeId == recipeId && v.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var v in versions)
        {
            v.IsActive = false;
            v.EffectiveTo = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditWriter.WriteAsync("RecipeDeleted", nameof(Recipe), recipe.Id, currentUser.Username, null, cancellationToken);
        return true;
    }
}
