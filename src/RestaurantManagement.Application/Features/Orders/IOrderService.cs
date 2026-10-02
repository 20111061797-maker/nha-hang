namespace RestaurantManagement.Application.Features.Orders;

public interface IOrderService
{
    Task<OrderDetails> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken);
    Task<OrderDetails?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<OrderListItem>> GetBranchOrdersAsync(Guid branchId, CancellationToken cancellationToken);
    Task<OrderDetails?> AddItemAsync(Guid orderId, AddOrderItemRequest request, CancellationToken cancellationToken);
    Task<OrderDetails?> UpdateItemAsync(Guid orderId, Guid itemId, UpdateOrderItemRequest request, CancellationToken cancellationToken);
    Task<OrderDetails?> RemoveItemAsync(Guid orderId, Guid itemId, long? expectedVersion, CancellationToken cancellationToken);
    Task<OrderDetails?> ChangeStatusAsync(Guid orderId, ChangeOrderStatusRequest request, CancellationToken cancellationToken);
    Task<OrderDetails?> CancelAsync(Guid orderId, CancelOrderRequest request, CancellationToken cancellationToken);
}