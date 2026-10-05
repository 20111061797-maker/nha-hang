using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Orders;

public sealed record CreateOrderRequest(Guid BranchId, OrderType OrderType, Guid? DiningTableId, Guid? CustomerId, string? CustomerNameSnapshot, string? CustomerPhoneSnapshot, string? DeliveryAddressSnapshot, string? Notes);
public sealed record AddOrderItemRequest(Guid? ProductId, Guid? ProductVariantId, Guid? ComboId, decimal Quantity, IReadOnlyList<Guid> ModifierIds, string? Notes, long? ExpectedVersion);
public sealed record UpdateOrderItemRequest(Guid? ProductId, Guid? ProductVariantId, Guid? ComboId, decimal Quantity, IReadOnlyList<Guid> ModifierIds, string? Notes, long? ExpectedVersion);
public sealed record ChangeOrderStatusRequest(OrderStatus Status, string? Reason, long? ExpectedVersion);
public sealed record CancelOrderRequest(string Reason, long? ExpectedVersion);

public sealed record OrderListItem(Guid Id, string OrderNumber, Guid BranchId, OrderType OrderType, OrderStatus Status, decimal TotalAmount, DateTimeOffset CreatedAt, long Version, Guid? DiningTableId = null);
public sealed record OrderDetails(Guid Id, string OrderNumber, Guid BranchId, OrderType OrderType, OrderStatus Status, Guid? DiningTableId, string? CustomerNameSnapshot, string? CustomerPhoneSnapshot, string? DeliveryAddressSnapshot, string CurrencyCode, string? Notes, decimal Subtotal, decimal DiscountAmount, decimal TaxAmount, decimal TotalAmount, long Version, DateTimeOffset CreatedAt, IReadOnlyList<OrderItemDetails> Items);
public sealed record OrderItemDetails(Guid Id, Guid? ProductId, Guid? ProductVariantId, Guid? ComboId, string ProductNameSnapshot, string? VariantNameSnapshot, string? ComboNameSnapshot, decimal Quantity, decimal UnitPrice, decimal LineTotal, string? Notes, IReadOnlyList<OrderItemModifierDetails> Modifiers);
public sealed record OrderItemModifierDetails(Guid Id, Guid ModifierId, string ModifierNameSnapshot, decimal Quantity, decimal UnitPrice, decimal TotalPrice);