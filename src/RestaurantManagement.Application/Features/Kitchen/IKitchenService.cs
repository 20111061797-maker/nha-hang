using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Kitchen;

public interface IKitchenService
{
    Task<IReadOnlyList<KitchenStationResponse>> GetStationsAsync(Guid branchId, CancellationToken cancellationToken);
    Task<KitchenStationResponse?> GetStationAsync(Guid stationId, CancellationToken cancellationToken);
    Task<KitchenStationResponse> CreateStationAsync(Guid branchId, CreateKitchenStationRequest request, CancellationToken cancellationToken);
    Task<KitchenStationResponse?> UpdateStationAsync(Guid stationId, UpdateKitchenStationRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<KitchenStationProductResponse>> GetStationProductsAsync(Guid stationId, CancellationToken cancellationToken);
    Task<IReadOnlyList<KitchenStationProductResponse>> SetStationProductsAsync(Guid stationId, KitchenStationProductRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<KitchenOrderResponse>> GetBranchOrdersAsync(Guid branchId, Guid? stationId, KitchenOrderStatus? status, CancellationToken cancellationToken);
    Task<KitchenOrderResponse?> GetOrderAsync(Guid kitchenOrderId, CancellationToken cancellationToken);
    Task<IReadOnlyList<KitchenOrderResponse>> CreateForConfirmedOrderAsync(Guid orderId, CancellationToken cancellationToken);
    Task<KitchenOrderResponse?> ChangeStatusAsync(Guid kitchenOrderId, KitchenOrderStatus target, KitchenOrderStatusRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteStationAsync(Guid stationId, CancellationToken cancellationToken);
}

public interface IKitchenEventPublisher
{
    Task PublishAsync(KitchenEvent kitchenEvent, CancellationToken cancellationToken);
}