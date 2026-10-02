namespace RestaurantManagement.Application.Features.Pricing;

public sealed record ProductPricingRequest(Guid ProductId, Guid? VariantId, Guid BranchId, IReadOnlyList<Guid> ModifierIds);
public sealed record ProductPricingResult(decimal BasePrice, decimal ModifierTotal, decimal FinalUnitPrice, string Currency);
public interface IProductPricingService
{
    Task<ProductPricingResult> CalculateAsync(ProductPricingRequest request, CancellationToken cancellationToken);
}