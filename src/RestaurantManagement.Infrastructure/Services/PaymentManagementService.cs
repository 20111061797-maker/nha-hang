using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Payments;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class PaymentManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IPaymentService
{
    public async Task<PaymentResponse> CreateAsync(Guid orderId, CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new ApplicationException("Payment amount must be greater than zero.");
        if (request.PaymentMethod == PaymentMethod.Cash && (!request.TenderedAmount.HasValue || request.TenderedAmount < request.Amount)) throw new ApplicationException("Cash tendered amount must cover the payment amount.");
        var order = await LoadOrderAsync(orderId, cancellationToken);
        if (!string.IsNullOrWhiteSpace(request.CurrencyCode) && !string.Equals(request.CurrencyCode, order.CurrencyCode, StringComparison.OrdinalIgnoreCase)) throw new ConflictException("Payment currency must match the order currency.");
        if (request.IdempotencyKey is { Length: > 0 } key)
        {
            var existing = await dbContext.Payments.FirstOrDefaultAsync(x => x.OrderId == orderId && x.IdempotencyKey == key, cancellationToken);
            if (existing is not null)
            {
                if (!MatchesIdempotentRequest(existing, request)) throw new ConflictException("The idempotency key was already used with a different payment request.");
                return ToResponse(existing);
            }
        }

        EnsurePayableOrder(order);
        var remaining = await GetRemainingPayableAmountAsync(order, cancellationToken);
        if (request.Amount > remaining) throw new ConflictException("Payment exceeds the remaining payable amount.");

        var now = DateTimeOffset.UtcNow;
        var payment = new Payment
        {
            OrderId = order.Id,
            BranchId = order.BranchId,
            PaymentNumber = await GeneratePaymentNumberAsync(cancellationToken),
            CreatedBy = currentUser.UserId,
            Method = request.PaymentMethod,
            Status = request.PaymentMethod == PaymentMethod.Cash ? PaymentStatus.Completed : PaymentStatus.Pending,
            Amount = request.Amount,
            TenderedAmount = request.TenderedAmount,
            ChangeAmount = request.PaymentMethod == PaymentMethod.Cash ? request.TenderedAmount - request.Amount : null,
            CurrencyCode = order.CurrencyCode,
            TransactionReference = request.TransactionReference,
            Provider = request.Provider,
            ProviderTransactionId = request.ProviderTransactionId,
            Note = request.Note,
            IdempotencyKey = request.IdempotencyKey,
            PaymentDate = now,
            CompletedAt = request.PaymentMethod == PaymentMethod.Cash ? now : null
        };
        dbContext.Payments.Add(payment);
        dbContext.PaymentAllocations.Add(new PaymentAllocation { PaymentId = payment.Id, OrderId = order.Id, Amount = payment.Amount });
        order.Version++;
        await auditWriter.WriteAsync("PaymentCreated", nameof(Payment), payment.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToResponse(payment);
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetOrderPaymentsAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var order = await LoadOrderAsync(orderId, cancellationToken);
        return await dbContext.Payments.AsNoTracking().Where(x => x.OrderId == order.Id).OrderByDescending(x => x.PaymentDate).Select(x => ToResponse(x)).ToListAsync(cancellationToken);
    }

    public async Task<PaymentResponse?> GetAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        if (payment is null) return null;
        await EnsureBranchAccessAsync(payment.BranchId, cancellationToken);
        return ToResponse(payment);
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetBranchPaymentsAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);

        // Tự động chuẩn hóa phân loại phiếu thu: chuyển các giao dịch từ đơn QR hoặc chứa ghi chú SePay/QR sang QrPayment
        var existingPaymentsToFix = await dbContext.Payments
            .Where(p => p.BranchId == branchId && p.Method == PaymentMethod.Cash && (
                p.PaymentNumber.Contains("-QR-") ||
                p.PaymentNumber.Contains("13AEE4E9") ||
                p.PaymentNumber.Contains("E3CFCCF5") ||
                (p.Note != null && (p.Note.Contains("SePay") || p.Note.Contains("VietQR") || p.Note.Contains("quét mã") || p.Note.Contains("chuyển khoản")))
            ))
            .ToListAsync(cancellationToken);

        if (existingPaymentsToFix.Count > 0)
        {
            foreach (var p in existingPaymentsToFix)
            {
                p.Method = PaymentMethod.QrPayment;
                p.Provider = "SePay";
                if (string.IsNullOrWhiteSpace(p.Note) || p.Note.Contains("tiền mặt"))
                {
                    p.Note = "Thanh toán quét mã SePay / VietQR";
                }
            }
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var qrOrderIds = await dbContext.Orders
            .Where(o => o.BranchId == branchId && o.OrderNumber.StartsWith("QR"))
            .Select(o => o.Id)
            .ToListAsync(cancellationToken);

        if (qrOrderIds.Count > 0)
        {
            var misclassifiedQrPayments = await dbContext.Payments
                .Where(p => p.BranchId == branchId && qrOrderIds.Contains(p.OrderId) && p.Method == PaymentMethod.Cash && (p.Provider == "SePay" || (p.Note != null && (p.Note.Contains("SePay") || p.Note.Contains("VietQR")))))
                .ToListAsync(cancellationToken);

            if (misclassifiedQrPayments.Count > 0)
            {
                foreach (var p in misclassifiedQrPayments)
                {
                    p.Method = PaymentMethod.QrPayment;
                    p.Provider = "SePay";
                    p.Note = "Thanh toán quét mã SePay / VietQR tại bàn";
                }
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        // Tự động đồng bộ hóa: các đơn hàng đã hoàn tất tại chi nhánh nhưng chưa có phiếu thu
        var existingOrderIds = await dbContext.Payments
            .Where(x => x.BranchId == branchId)
            .Select(x => x.OrderId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var missingOrders = await dbContext.Orders
            .Where(o => o.BranchId == branchId && o.Status == OrderStatus.Completed && !existingOrderIds.Contains(o.Id))
            .OrderByDescending(o => o.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        if (missingOrders.Count > 0)
        {
            foreach (var o in missingOrders)
            {
                var payDate = o.UpdatedAt > DateTimeOffset.MinValue ? o.UpdatedAt : o.CreatedAt;
                var isQr = (!string.IsNullOrWhiteSpace(o.OrderNumber) && o.OrderNumber.StartsWith("QR", StringComparison.OrdinalIgnoreCase))
                    || (!string.IsNullOrWhiteSpace(o.Notes) && (o.Notes.Contains("SePay", StringComparison.OrdinalIgnoreCase) || o.Notes.Contains("QR", StringComparison.OrdinalIgnoreCase) || o.Notes.Contains("chuyển khoản", StringComparison.OrdinalIgnoreCase)));
                var payment = new Payment
                {
                    OrderId = o.Id,
                    BranchId = o.BranchId,
                    PaymentNumber = $"PAY-{payDate:yyyyMMdd}-{o.OrderNumber}",
                    Method = isQr ? PaymentMethod.QrPayment : PaymentMethod.Cash,
                    Status = PaymentStatus.Completed,
                    Amount = o.TotalAmount,
                    TenderedAmount = o.TotalAmount,
                    ChangeAmount = 0,
                    CurrencyCode = o.CurrencyCode,
                    Provider = isQr ? "SePay" : null,
                    Note = isQr ? "Thanh toán quét mã SePay / VietQR" : "Thanh toán tiền mặt tại quầy thu ngân",
                    PaymentDate = payDate,
                    CompletedAt = payDate
                };
                dbContext.Payments.Add(payment);
                dbContext.PaymentAllocations.Add(new PaymentAllocation { PaymentId = payment.Id, OrderId = o.Id, Amount = payment.Amount });
            }
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return await dbContext.Payments.AsNoTracking().Where(x => x.BranchId == branchId).OrderByDescending(x => x.PaymentDate).Take(500).Select(x => ToResponse(x)).ToListAsync(cancellationToken);
    }

    public async Task<PaymentResponse?> CompleteAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await LoadPaymentAsync(paymentId, cancellationToken);
        if (payment.Status == PaymentStatus.Completed) return ToResponse(payment);
        if (payment.Status != PaymentStatus.Pending && payment.Status != PaymentStatus.Processing) throw new ApplicationException("Only pending payments can be completed.");
        payment.Status = PaymentStatus.Completed;
        payment.CompletedAt = DateTimeOffset.UtcNow;
        payment.Version++;
        await auditWriter.WriteAsync("PaymentCompleted", nameof(Payment), payment.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToResponse(payment);
    }

    public async Task<PaymentResponse?> CancelAsync(Guid paymentId, CancelPaymentRequest request, CancellationToken cancellationToken)
    {
        var payment = await LoadPaymentAsync(paymentId, cancellationToken);
        if (payment.Status == PaymentStatus.Cancelled) return ToResponse(payment);
        if (payment.Status != PaymentStatus.Pending && payment.Status != PaymentStatus.Processing) throw new ApplicationException("Only pending payments can be cancelled.");
        payment.Status = PaymentStatus.Cancelled;
        payment.Note = string.IsNullOrWhiteSpace(payment.Note) ? request.Reason : $"{payment.Note} | Cancelled: {request.Reason}";
        payment.Version++;
        await auditWriter.WriteAsync("PaymentCancelled", nameof(Payment), payment.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToResponse(payment);
    }

    public async Task<PaymentRefundResponse> RefundAsync(Guid paymentId, CreatePaymentRefundRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0) throw new ApplicationException("Refund amount must be greater than zero.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new ApplicationException("Refund reason is required.");
        var payment = await LoadPaymentAsync(paymentId, cancellationToken);
        if (payment.Status is not (PaymentStatus.Completed or PaymentStatus.PartiallyRefunded)) throw new ApplicationException("Only completed payments can be refunded.");
        var refunded = await dbContext.PaymentRefunds.Where(x => x.PaymentId == paymentId && x.Status == PaymentStatus.Completed).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0;
        if (request.Amount > payment.Amount - refunded) throw new ConflictException("Refund exceeds the refundable amount.");
        var refund = new PaymentRefund { PaymentId = paymentId, Amount = request.Amount, Reason = request.Reason, RefundReference = request.RefundReference, ProviderRefundId = request.ProviderRefundId, CreatedBy = currentUser.UserId };
        dbContext.PaymentRefunds.Add(refund);
        payment.Status = request.Amount == payment.Amount - refunded ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded;
        payment.Version++;
        await auditWriter.WriteAsync(payment.Status == PaymentStatus.Refunded ? "PaymentRefunded" : "PaymentPartiallyRefunded", nameof(Payment), payment.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToRefundResponse(refund);
    }

    public async Task<IReadOnlyList<PaymentRefundResponse>> GetRefundsAsync(Guid paymentId, CancellationToken cancellationToken)
    {
        _ = await LoadPaymentAsync(paymentId, cancellationToken);
        return await dbContext.PaymentRefunds.AsNoTracking().Where(x => x.PaymentId == paymentId).OrderByDescending(x => x.CreatedAt).Select(x => ToRefundResponse(x)).ToListAsync(cancellationToken);
    }

    public async Task<PaymentSummary?> GetSummaryAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var order = await LoadOrderAsync(orderId, cancellationToken);
        var paid = await GetPaidAmountAsync(orderId, cancellationToken);
            var refunded = await (from refund in dbContext.PaymentRefunds
                          join payment in dbContext.Payments on refund.PaymentId equals payment.Id
                          join allocation in dbContext.PaymentAllocations on payment.Id equals allocation.PaymentId
                          where allocation.OrderId == orderId && refund.Status == PaymentStatus.Completed
                          select (decimal?)refund.Amount).SumAsync(cancellationToken) ?? 0;
        var net = paid - refunded;
        return new PaymentSummary(order.TotalAmount, paid, refunded, net, Math.Max(0, order.TotalAmount - net), net <= 0 ? "Unpaid" : net < order.TotalAmount ? "PartiallyPaid" : "Paid");
    }

    public async Task<PaymentResponse?> ReclassifyAsync(Guid paymentId, ReclassifyPaymentRequest request, CancellationToken cancellationToken)
    {
        var payment = await LoadPaymentAsync(paymentId, cancellationToken);
        payment.Method = request.PaymentMethod;
        if (!string.IsNullOrWhiteSpace(request.Provider)) payment.Provider = request.Provider;
        if (!string.IsNullOrWhiteSpace(request.Note)) payment.Note = request.Note;
        if (!string.IsNullOrWhiteSpace(request.ProviderTransactionId)) payment.ProviderTransactionId = request.ProviderTransactionId;
        if (!string.IsNullOrWhiteSpace(request.TransactionReference)) payment.TransactionReference = request.TransactionReference;
        payment.Version++;
        await auditWriter.WriteAsync("PaymentReclassified", nameof(Payment), payment.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToResponse(payment);
    }

    private async Task<Order> LoadOrderAsync(Guid id, CancellationToken ct) => await dbContext.Orders.FirstOrDefaultAsync(x => x.Id == id, ct) is { } order ? await EnsureOrderAccessAsync(order, ct) : throw new ApplicationException("Order does not exist.");
    private async Task<Payment> LoadPaymentAsync(Guid id, CancellationToken ct) => await dbContext.Payments.FirstOrDefaultAsync(x => x.Id == id, ct) is { } payment ? await EnsurePaymentAccessAsync(payment, ct) : throw new ApplicationException("Payment does not exist.");
    private async Task<Order> EnsureOrderAccessAsync(Order order, CancellationToken ct) { await EnsureBranchAccessAsync(order.BranchId, ct); return order; }
    private async Task<Payment> EnsurePaymentAccessAsync(Payment payment, CancellationToken ct) { await EnsureBranchAccessAsync(payment.BranchId, ct); return payment; }
    private static void EnsurePayableOrder(Order order) { if (order.Status is OrderStatus.Draft or OrderStatus.Cancelled) throw new ApplicationException("This order cannot be paid in its current state."); }
    private static bool MatchesIdempotentRequest(Payment payment, CreatePaymentRequest request) => payment.Method == request.PaymentMethod
        && payment.Amount == request.Amount
        && payment.TenderedAmount == request.TenderedAmount
        && string.Equals(payment.TransactionReference, request.TransactionReference, StringComparison.Ordinal)
        && string.Equals(payment.Provider, request.Provider, StringComparison.Ordinal)
        && string.Equals(payment.ProviderTransactionId, request.ProviderTransactionId, StringComparison.Ordinal)
        && string.Equals(payment.Note, request.Note, StringComparison.Ordinal)
        && (string.IsNullOrWhiteSpace(request.CurrencyCode) || string.Equals(payment.CurrencyCode, request.CurrencyCode, StringComparison.OrdinalIgnoreCase));
    private async Task<decimal> GetRemainingPayableAmountAsync(Order order, CancellationToken ct)
    {
        var grossPaid = await GetPaidAmountAsync(order.Id, ct);
        var refunded = await GetRefundedAmountAsync(order.Id, ct);
        var pending = await (from allocation in dbContext.PaymentAllocations
                             join payment in dbContext.Payments on allocation.PaymentId equals payment.Id
                             where allocation.OrderId == order.Id && (payment.Status == PaymentStatus.Pending || payment.Status == PaymentStatus.Processing)
                             select (decimal?)allocation.Amount).SumAsync(ct) ?? 0;
        return order.TotalAmount - grossPaid + refunded - pending;
    }
    private async Task<decimal> GetPaidAmountAsync(Guid orderId, CancellationToken ct) => await (from allocation in dbContext.PaymentAllocations
                                                                                      join payment in dbContext.Payments on allocation.PaymentId equals payment.Id
                                                                                      where allocation.OrderId == orderId && new[] { PaymentStatus.Completed, PaymentStatus.PartiallyRefunded, PaymentStatus.Refunded }.Contains(payment.Status)
                                                                                      select (decimal?)allocation.Amount).SumAsync(ct) ?? 0;
    private async Task<decimal> GetRefundedAmountAsync(Guid orderId, CancellationToken ct) => await (from refund in dbContext.PaymentRefunds
                                                                                                      join payment in dbContext.Payments on refund.PaymentId equals payment.Id
                                                                                                      join allocation in dbContext.PaymentAllocations on payment.Id equals allocation.PaymentId
                                                                                                      where allocation.OrderId == orderId && refund.Status == PaymentStatus.Completed
                                                                                                      select (decimal?)refund.Amount).SumAsync(ct) ?? 0;
    private async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken ct) { if (currentUser.IsAdministrator) return; if (currentUser.UserId is not Guid userId || (!await dbContext.UserBranchAccesses.AnyAsync(x => x.UserId == userId && x.BranchId == branchId && x.IsActive, ct) && !await dbContext.Users.AnyAsync(x => x.Id == userId && x.EmployeeId != null && dbContext.Employees.Any(e => e.Id == userId && e.BranchId == branchId && e.IsActive), ct))) throw new ForbiddenException("You do not have access to this branch."); }
    private static Task<string> GeneratePaymentNumberAsync(CancellationToken ct) => Task.FromResult($"PAY-{DateTimeOffset.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..27].ToUpperInvariant());
    private async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            await dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("The payment or order was changed by another user.");
        }
        catch (DbUpdateException)
        {
            throw new ConflictException("The payment could not be committed because it conflicts with another financial operation.");
        }
    }
    private static PaymentResponse ToResponse(Payment x) => new(x.Id, x.OrderId, x.BranchId, x.PaymentNumber, x.Method, x.Status, x.Amount, x.TenderedAmount, x.ChangeAmount, x.CurrencyCode, x.TransactionReference, x.Provider, x.ProviderTransactionId, x.CompletedAt, x.CreatedAt, x.Note);
    private static PaymentRefundResponse ToRefundResponse(PaymentRefund x) => new(x.Id, x.PaymentId, x.Amount, x.Reason, x.Status, x.RefundReference, x.ProviderRefundId, x.CreatedAt);
}