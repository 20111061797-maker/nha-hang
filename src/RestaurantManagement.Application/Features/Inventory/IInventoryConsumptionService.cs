using RestaurantManagement.Application.Features.Recipes;

namespace RestaurantManagement.Application.Features.Inventory;

public interface IInventoryConsumptionService
{
    Task<InventoryDeductionResult> DeductForKitchenOrderAsync(Guid kitchenOrderId, CancellationToken cancellationToken = default);
    Task<InventoryDeductionResult> DeductForKitchenOrderItemAsync(Guid kitchenOrderItemId, CancellationToken cancellationToken = default);
    Task<InventoryDeductionResult> RecordWasteAsync(RecordWasteRequest request, CancellationToken cancellationToken = default);
    Task<InventoryDeductionResult> RecordReCookAsync(RecordReCookRequest request, CancellationToken cancellationToken = default);
}
