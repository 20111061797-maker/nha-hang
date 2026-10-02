using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Features.Pricing;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class ProductPricingService(RestaurantDbContext dbContext) : IProductPricingService
{
    public async Task<ProductPricingResult> CalculateAsync(ProductPricingRequest request, CancellationToken cancellationToken)
    {
        var branchProduct = await dbContext.BranchProducts.AsNoTracking().FirstOrDefaultAsync(x => x.BranchId == request.BranchId && x.ProductId == request.ProductId && x.IsActive && x.IsAvailable, cancellationToken) ?? throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Product is not available in this branch.");
        var basePrice = branchProduct.PriceOverride ?? 0m;
        if (request.VariantId is Guid variantId)
        {
            var variant = await dbContext.ProductVariants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == variantId && x.ProductId == request.ProductId && x.IsActive, cancellationToken) ?? throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Variant is invalid or inactive.");
            basePrice = variant.DefaultPrice ?? basePrice;
        }

        var modifierIds = request.ModifierIds.Distinct().ToArray();
        var allowedModifierIds = await (from assignment in dbContext.ProductModifierGroups.AsNoTracking()
                        join modifier in dbContext.Modifiers.AsNoTracking() on assignment.ModifierGroupId equals modifier.ModifierGroupId
                        where assignment.ProductId == request.ProductId && modifier.IsActive
                        select modifier.Id).ToListAsync(cancellationToken);
        if (modifierIds.Any(id => !allowedModifierIds.Contains(id))) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("One or more modifiers are not assigned to this product.");
        var modifierPrices = await (from modifier in dbContext.Modifiers.AsNoTracking()
                                    join option in dbContext.ProductModifierOptions.AsNoTracking() on new { ModifierId = modifier.Id, ProductId = request.ProductId } equals new { option.ModifierId, option.ProductId } into options
                                    from option in options.DefaultIfEmpty()
                                    where modifierIds.Contains(modifier.Id) && modifier.IsActive
                                    select option == null ? modifier.DefaultPrice : option.PriceOverride ?? modifier.DefaultPrice).ToListAsync(cancellationToken);
        if (modifierPrices.Count != modifierIds.Length) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("One or more modifiers are invalid or inactive.");
        var modifierTotal = modifierPrices.Sum();
        return new ProductPricingResult(basePrice, modifierTotal, basePrice + modifierTotal, "VND");
    }
}