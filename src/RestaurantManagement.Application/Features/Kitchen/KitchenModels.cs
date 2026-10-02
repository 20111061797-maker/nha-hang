using FluentValidation;
using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Kitchen;

public sealed record CreateKitchenStationRequest(string Code, string Name, string? Description, int DisplayOrder);
public sealed record UpdateKitchenStationRequest(string Code, string Name, string? Description, int DisplayOrder, bool IsActive);
public sealed record KitchenStationResponse(Guid Id, Guid BranchId, string Code, string Name, string? Description, int DisplayOrder, bool IsActive);
public sealed record KitchenStationProductRequest(IReadOnlyList<Guid> ProductIds);
public sealed record KitchenStationProductResponse(Guid ProductId, int DisplayOrder, bool IsActive);
public sealed record KitchenOrderStatusRequest(long? ExpectedVersion);
public sealed record KitchenOrderItemResponse(Guid Id, Guid OrderItemId, Guid ProductId, string ProductName, string? VariantName, decimal Quantity, KitchenOrderStatus Status, string? Notes, IReadOnlyList<string> Modifiers);
public sealed record KitchenOrderResponse(Guid Id, Guid OrderId, Guid BranchId, Guid StationId, string StationName, string OrderNumber, OrderType OrderType, string? TableNumber, KitchenOrderStatus Status, KitchenPriority Priority, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, long Version, IReadOnlyList<KitchenOrderItemResponse> Items);
public sealed record KitchenEvent(string EventName, Guid KitchenOrderId, Guid OrderId, Guid BranchId, Guid StationId, KitchenOrderStatus Status, DateTimeOffset UpdatedAt, Guid? ItemId = null);

public sealed class CreateKitchenStationValidator : AbstractValidator<CreateKitchenStationRequest>
{
    public CreateKitchenStationValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}

public sealed class UpdateKitchenStationValidator : AbstractValidator<UpdateKitchenStationRequest>
{
    public UpdateKitchenStationValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500);
        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
    }
}