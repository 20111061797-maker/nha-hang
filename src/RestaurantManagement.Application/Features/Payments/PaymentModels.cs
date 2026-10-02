using FluentValidation;
using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Payments;

public sealed record CreatePaymentRequest(
    PaymentMethod PaymentMethod,
    decimal Amount,
    decimal? TenderedAmount,
    string? TransactionReference,
    string? Provider,
    string? ProviderTransactionId,
    string? Note,
    string? IdempotencyKey,
    string? CurrencyCode = null);

public sealed record CancelPaymentRequest(string Reason);
public sealed record CreatePaymentRefundRequest(decimal Amount, string Reason, string? RefundReference, string? ProviderRefundId);

public sealed record PaymentResponse(
    Guid Id,
    Guid OrderId,
    Guid BranchId,
    string PaymentNumber,
    PaymentMethod PaymentMethod,
    PaymentStatus Status,
    decimal Amount,
    decimal? TenderedAmount,
    decimal? ChangeAmount,
    string CurrencyCode,
    string? TransactionReference,
    string? Provider,
    string? ProviderTransactionId,
    DateTimeOffset? CompletedAt,
    DateTimeOffset CreatedAt,
    string? Note);

public sealed record PaymentRefundResponse(Guid Id, Guid PaymentId, decimal Amount, string Reason, PaymentStatus Status, string? RefundReference, string? ProviderRefundId, DateTimeOffset CreatedAt);
public sealed record PaymentSummary(decimal OrderTotal, decimal PaidAmount, decimal RefundedAmount, decimal NetPaidAmount, decimal RemainingAmount, string PaymentStatus);

public sealed class CreatePaymentValidator : AbstractValidator<CreatePaymentRequest>
{
    public CreatePaymentValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.TenderedAmount).GreaterThanOrEqualTo(x => x.Amount).When(x => x.PaymentMethod == PaymentMethod.Cash && x.TenderedAmount.HasValue);
        RuleFor(x => x.TenderedAmount).NotNull().When(x => x.PaymentMethod == PaymentMethod.Cash);
        RuleFor(x => x.TransactionReference).MaximumLength(200);
        RuleFor(x => x.Provider).MaximumLength(100);
        RuleFor(x => x.ProviderTransactionId).MaximumLength(200);
        RuleFor(x => x.Note).MaximumLength(500);
        RuleFor(x => x.IdempotencyKey).MaximumLength(200);
    }
}

public sealed class CreatePaymentRefundValidator : AbstractValidator<CreatePaymentRefundRequest>
{
    public CreatePaymentRefundValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
        RuleFor(x => x.RefundReference).MaximumLength(200);
        RuleFor(x => x.ProviderRefundId).MaximumLength(200);
    }
}