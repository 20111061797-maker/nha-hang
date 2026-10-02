using FluentValidation;

namespace RestaurantManagement.Application.Features.Orders;

public sealed class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator() { RuleFor(x => x.BranchId).NotEmpty(); RuleFor(x => x.OrderType).IsInEnum(); RuleFor(x => x.DeliveryAddressSnapshot).NotEmpty().When(x => x.OrderType == Domain.Enums.OrderType.Delivery); }
}
public sealed class OrderItemValidator<T> : AbstractValidator<T> where T : class
{
    public OrderItemValidator() { RuleFor(x => GetQuantity(x)).GreaterThan(0); RuleFor(x => x).Must(HasProductOrCombo).WithMessage("A product or combo is required."); }
    private static decimal GetQuantity(T request) => request switch { AddOrderItemRequest x => x.Quantity, UpdateOrderItemRequest x => x.Quantity, _ => 0 };
    private static bool HasProductOrCombo(T request) => request switch { AddOrderItemRequest x => x.ProductId.HasValue ^ x.ComboId.HasValue, UpdateOrderItemRequest x => x.ProductId.HasValue ^ x.ComboId.HasValue, _ => false };
}
public sealed class AddOrderItemValidator : AbstractValidator<AddOrderItemRequest>
{
    public AddOrderItemValidator() { RuleFor(x => x.Quantity).GreaterThan(0); RuleFor(x => x).Must(x => x.ProductId.HasValue ^ x.ComboId.HasValue).WithMessage("Exactly one product or combo is required."); }
}
public sealed class UpdateOrderItemValidator : AbstractValidator<UpdateOrderItemRequest>
{
    public UpdateOrderItemValidator() { RuleFor(x => x.Quantity).GreaterThan(0); RuleFor(x => x).Must(x => x.ProductId.HasValue ^ x.ComboId.HasValue).WithMessage("Exactly one product or combo is required."); }
}