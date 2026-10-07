namespace RestaurantManagement.Application.Features.Payments;

public interface IPaymentService
{
    Task<PaymentResponse> CreateAsync(Guid orderId, CreatePaymentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PaymentResponse>> GetOrderPaymentsAsync(Guid orderId, CancellationToken cancellationToken);
    Task<PaymentResponse?> GetAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<PaymentResponse>> GetBranchPaymentsAsync(Guid branchId, CancellationToken cancellationToken);
    Task<PaymentResponse?> CompleteAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentResponse?> CancelAsync(Guid paymentId, CancelPaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentRefundResponse> RefundAsync(Guid paymentId, CreatePaymentRefundRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PaymentRefundResponse>> GetRefundsAsync(Guid paymentId, CancellationToken cancellationToken);
    Task<PaymentSummary?> GetSummaryAsync(Guid orderId, CancellationToken cancellationToken);
    Task<PaymentResponse?> ReclassifyAsync(Guid paymentId, ReclassifyPaymentRequest request, CancellationToken cancellationToken);
}