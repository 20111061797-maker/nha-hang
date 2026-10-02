using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Payments;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using RestaurantManagement.Infrastructure.Services;

namespace RestaurantManagement.Tests.Payments;

public sealed class PaymentManagementServiceTests
{
    [Fact]
    public async Task Cash_payment_completes_and_calculates_change()
    {
        var (service, context, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 80, 100, null, null, null, null, null), CancellationToken.None);

        payment.Status.Should().Be(PaymentStatus.Completed);
        payment.ChangeAmount.Should().Be(20);
        (await context.PaymentAllocations.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Split_payments_cannot_exceed_order_total()
    {
        var (service, _, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 60, 60, null, null, null, null, null), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 50, 50, null, null, null, null, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Non_cash_payment_is_pending_until_completed()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.QrPayment, 40, null, "qr-1", "Demo", "provider-1", null, null), CancellationToken.None);

        payment.Status.Should().Be(PaymentStatus.Pending);
        (await service.CompleteAsync(payment.Id, CancellationToken.None))!.Status.Should().Be(PaymentStatus.Completed);
    }

    [Fact]
    public async Task Cancelled_pending_payment_does_not_consume_payable_amount()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.BankTransfer, 40, null, null, null, null, null, null), CancellationToken.None);
        await service.CancelAsync(payment.Id, new CancelPaymentRequest("timeout"), CancellationToken.None);

        var replacement = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        replacement.Status.Should().Be(PaymentStatus.Completed);
    }

    [Fact]
    public async Task Partial_and_full_refund_are_append_only()
    {
        var (service, context, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(30, "requested", "r-1", null), CancellationToken.None);
        var final = await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(70, "requested", "r-2", null), CancellationToken.None);

        final.Amount.Should().Be(70);
        (await context.PaymentRefunds.CountAsync()).Should().Be(2);
        (await service.GetAsync(payment.Id, CancellationToken.None))!.Status.Should().Be(PaymentStatus.Refunded);
    }

    [Fact]
    public async Task Refund_over_remaining_amount_is_rejected()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(60, "requested", null, null), CancellationToken.None);

        await FluentActions.Awaiting(() => service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(50, "requested", null, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Same_idempotency_key_returns_original_payment()
    {
        var (service, context, order) = Setup();
        var request = new CreatePaymentRequest(PaymentMethod.Cash, 25, 25, null, null, null, null, "retry-1");
        var first = await service.CreateAsync(order.Id, request, CancellationToken.None);
        var retry = await service.CreateAsync(order.Id, request, CancellationToken.None);

        retry.Id.Should().Be(first.Id);
        (await context.Payments.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Cancelled_order_cannot_be_paid()
    {
        var (service, context, order) = Setup();
        order.Status = OrderStatus.Cancelled;
        await context.SaveChangesAsync();

        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None))
            .Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Summary_reports_net_paid_and_remaining_amount()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 60, 60, null, null, null, null, null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(10, "requested", null, null), CancellationToken.None);

        var summary = await service.GetSummaryAsync(order.Id, CancellationToken.None);
        summary!.PaidAmount.Should().Be(60);
        summary.RefundedAmount.Should().Be(10);
        summary.NetPaidAmount.Should().Be(50);
        summary.RemainingAmount.Should().Be(50);
        summary.PaymentStatus.Should().Be("PartiallyPaid");
    }

    [Fact]
    public async Task Cash_payment_accepts_exact_tendered_amount()
    {
        var (service, _, order) = Setup();
        (await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None)).ChangeAmount.Should().Be(0);
    }

    [Fact]
    public async Task Cash_payment_rejects_insufficient_tendered_amount()
    {
        var (service, context, order) = Setup();
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 99, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
        (await context.Payments.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData(PaymentMethod.BankTransfer)]
    [InlineData(PaymentMethod.QrPayment)]
    [InlineData(PaymentMethod.Card)]
    [InlineData(PaymentMethod.EWallet)]
    [InlineData(PaymentMethod.Online)]
    public async Task Supported_non_cash_methods_start_pending(PaymentMethod method)
    {
        var (service, _, order) = Setup();
        (await service.CreateAsync(order.Id, new CreatePaymentRequest(method, 10, null, "ref", "provider", "provider-ref", null, null), CancellationToken.None)).Status.Should().Be(PaymentStatus.Pending);
    }

    [Fact]
    public async Task Service_rejects_non_positive_amount()
    {
        var (service, _, order) = Setup();
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 0, 0, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Invalid_order_is_rejected()
    {
        var (service, _, _) = Setup();
        await FluentActions.Awaiting(() => service.CreateAsync(Guid.NewGuid(), new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Draft_order_is_rejected()
    {
        var (service, context, order) = Setup();
        order.Status = OrderStatus.Draft;
        await context.SaveChangesAsync();
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Currency_mismatch_is_rejected()
    {
        var (service, context, order) = Setup();
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null, "USD"), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
        (await context.Payments.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Partial_payments_progress_to_paid()
    {
        var (service, _, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 30, 30, null, null, null, null, null), CancellationToken.None);
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 20, 20, null, null, null, null, null), CancellationToken.None);
        var final = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 50, 50, null, null, null, null, null), CancellationToken.None);
        var summary = await service.GetSummaryAsync(order.Id, CancellationToken.None);
        final.Status.Should().Be(PaymentStatus.Completed);
        summary!.PaidAmount.Should().Be(100);
        summary.RemainingAmount.Should().Be(0);
        summary.PaymentStatus.Should().Be("Paid");
    }

    [Fact]
    public async Task Split_payment_preserves_each_payment_record()
    {
        var (service, context, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 30, 30, null, null, null, null, null), CancellationToken.None);
        var bank = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.BankTransfer, 40, null, "bank", "bank", "b1", null, null), CancellationToken.None);
        var card = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Card, 30, null, "card", "card", "c1", null, null), CancellationToken.None);
        await service.CompleteAsync(bank.Id, CancellationToken.None);
        await service.CompleteAsync((await context.Payments.SingleAsync(x => x.Id == card.Id)).Id, CancellationToken.None);
        (await context.Payments.CountAsync()).Should().Be(3);
        (await service.GetSummaryAsync(order.Id, CancellationToken.None))!.RemainingAmount.Should().Be(0);
    }

    [Fact]
    public async Task Overpayment_does_not_create_payment_or_allocation()
    {
        var (service, context, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 80, 80, null, null, null, null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 30, 30, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
        (await context.Payments.CountAsync()).Should().Be(1);
        (await context.PaymentAllocations.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Pending_payment_reserves_remaining_amount()
    {
        var (service, _, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Online, 80, null, "online", null, null, null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 30, 30, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Idempotency_key_with_different_payload_is_rejected()
    {
        var (service, context, order) = Setup();
        await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 20, 20, null, null, null, null, "key"), CancellationToken.None);
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 21, 21, null, null, null, null, "key"), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
        (await context.Payments.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Completed_payment_cannot_be_cancelled()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.CancelAsync(payment.Id, new CancelPaymentRequest("late"), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Cancelled_payment_cannot_be_completed()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Online, 10, null, null, null, null, null, null), CancellationToken.None);
        await service.CancelAsync(payment.Id, new CancelPaymentRequest("timeout"), CancellationToken.None);
        await FluentActions.Awaiting(() => service.CompleteAsync(payment.Id, CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Partially_refunded_payment_can_only_refund_remaining_amount()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        var partial = await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(30, "partial", null, null), CancellationToken.None);
        partial.Status.Should().Be(PaymentStatus.Completed);
        (await service.GetAsync(payment.Id, CancellationToken.None))!.Status.Should().Be(PaymentStatus.PartiallyRefunded);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Invalid_refund_amount_is_rejected(decimal amount)
    {
        var (service, context, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(amount, "invalid", null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
        (await context.PaymentRefunds.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Refund_requires_reason()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(10, "", null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Failed_payment_cannot_be_refunded()
    {
        var (service, context, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Online, 10, null, null, null, null, null, null), CancellationToken.None);
        context.Payments.Single(x => x.Id == payment.Id).Status = PaymentStatus.Failed;
        await context.SaveChangesAsync();
        await FluentActions.Awaiting(() => service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(10, "failed", null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Payment_number_is_server_generated_and_unique()
    {
        var (service, _, order) = Setup();
        var first = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None);
        var second = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 20, 20, null, null, null, null, null), CancellationToken.None);
        first.PaymentNumber.Should().StartWith("PAY-");
        first.PaymentNumber.Should().NotBe(second.PaymentNumber);
        typeof(CreatePaymentRequest).GetProperty("PaymentNumber").Should().BeNull();
    }

    [Fact]
    public async Task Unauthorized_branch_cannot_create_payment()
    {
        var (service, _, order) = Setup(false);
        await FluentActions.Awaiting(() => service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None)).Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Refund_history_is_append_only()
    {
        var (service, context, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(10, "one", "r1", null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(20, "two", "r2", null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(50, "three", "r3", null), CancellationToken.None);
        (await context.PaymentRefunds.CountAsync(x => x.PaymentId == payment.Id)).Should().Be(3);
        (await service.GetRefundsAsync(payment.Id, CancellationToken.None)).Select(x => x.Amount).Should().BeEquivalentTo([10m, 20m, 50m]);
    }

    [Fact]
    public async Task Refund_on_refunded_payment_is_rejected()
    {
        var (service, _, order) = Setup();
        var payment = await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None);
        await service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(10, "all", null, null), CancellationToken.None);
        await FluentActions.Awaiting(() => service.RefundAsync(payment.Id, new CreatePaymentRefundRequest(1, "extra", null, null), CancellationToken.None)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Payment_read_is_denied_for_another_branch()
    {
        var (adminService, context, order) = Setup();
        var payment = await adminService.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None);
        var restricted = new PaymentManagementService(context, new TestUser(false), new TestAudit());
        await FluentActions.Awaiting(() => restricted.GetAsync(payment.Id, CancellationToken.None)).Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Payment_creation_uses_order_currency_when_request_omits_currency()
    {
        var (service, _, order) = Setup();
        (await service.CreateAsync(order.Id, new CreatePaymentRequest(PaymentMethod.Cash, 10, 10, null, null, null, null, null), CancellationToken.None)).CurrencyCode.Should().Be("VND");
    }

    [Fact]
    public async Task Create_payment_request_does_not_expose_server_fields()
    {
        typeof(CreatePaymentRequest).GetProperty("PaymentNumber").Should().BeNull();
        typeof(CreatePaymentRequest).GetProperty("Status").Should().BeNull();
        typeof(CreatePaymentRequest).GetProperty("BranchId").Should().BeNull();
    }

    [Fact]
    public async Task Concurrent_payments_allow_only_one_request_to_consume_remaining_balance()
    {
        var databaseName = Guid.NewGuid().ToString();
        await SeedDatabaseAsync(databaseName, 100);
        await using var firstContext = CreateContext(databaseName);
        await using var secondContext = CreateContext(databaseName);
        var first = new PaymentManagementService(firstContext, new TestUser(true), new TestAudit());
        var second = new PaymentManagementService(secondContext, new TestUser(true), new TestAudit());
        var orderId = await firstContext.Orders.Select(x => x.Id).SingleAsync();

        var results = await Task.WhenAll(
            CaptureAsync(() => first.CreateAsync(orderId, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None)),
            CaptureAsync(() => second.CreateAsync(orderId, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None)));

        results.Count(x => x is null).Should().Be(1);
        results.Count(x => x is not null).Should().Be(1);
        await using var verificationContext = CreateContext(databaseName);
        (await verificationContext.PaymentAllocations.SumAsync(x => x.Amount)).Should().Be(100);
    }

    [Fact]
    public async Task Concurrent_refunds_allow_only_one_request_to_consume_refundable_balance()
    {
        var databaseName = Guid.NewGuid().ToString();
        await SeedDatabaseAsync(databaseName, 100);
        await using var seedContext = CreateContext(databaseName);
        var seedService = new PaymentManagementService(seedContext, new TestUser(true), new TestAudit());
        var orderId = await seedContext.Orders.Select(x => x.Id).SingleAsync();
        var payment = await seedService.CreateAsync(orderId, new CreatePaymentRequest(PaymentMethod.Cash, 100, 100, null, null, null, null, null), CancellationToken.None);
        await using var firstContext = CreateContext(databaseName);
        await using var secondContext = CreateContext(databaseName);
        var first = new PaymentManagementService(firstContext, new TestUser(true), new TestAudit());
        var second = new PaymentManagementService(secondContext, new TestUser(true), new TestAudit());

        var results = await Task.WhenAll(
            CaptureRefundAsync(() => first.RefundAsync(payment.Id, new CreatePaymentRefundRequest(100, "one", null, null), CancellationToken.None)),
            CaptureRefundAsync(() => second.RefundAsync(payment.Id, new CreatePaymentRefundRequest(100, "two", null, null), CancellationToken.None)));

        results.Count(x => x is null).Should().Be(1);
        results.Count(x => x is not null).Should().Be(1);
        await using var verificationContext = CreateContext(databaseName);
        (await verificationContext.PaymentRefunds.SumAsync(x => x.Amount)).Should().Be(100);
    }

    private static (PaymentManagementService Service, RestaurantDbContext Context, Order Order) Setup(bool administrator = true)
    {
        var context = new RestaurantDbContext(new DbContextOptionsBuilder<RestaurantDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var branch = new Branch { Code = "MAIN", Name = "Main" };
        var order = new Order { BranchId = branch.Id, OrderNumber = "ORD-1", OrderType = OrderType.Takeaway, Status = OrderStatus.Open, TotalAmount = 100, CurrencyCode = "VND" };
        context.Branches.Add(branch);
        context.Orders.Add(order);
        context.SaveChanges();
        return (new PaymentManagementService(context, new TestUser(administrator), new TestAudit()), context, order);
    }

    private static RestaurantDbContext CreateContext(string databaseName) => new(new DbContextOptionsBuilder<RestaurantDbContext>().UseInMemoryDatabase(databaseName).Options);

    private static async Task SeedDatabaseAsync(string databaseName, decimal total)
    {
        await using var context = CreateContext(databaseName);
        var branch = new Branch { Code = Guid.NewGuid().ToString(), Name = "Main" };
        context.Branches.Add(branch);
        context.Orders.Add(new Order { BranchId = branch.Id, OrderNumber = Guid.NewGuid().ToString(), OrderType = OrderType.Takeaway, Status = OrderStatus.Open, TotalAmount = total, CurrencyCode = "VND" });
        await context.SaveChangesAsync();
    }

    private static async Task<Exception?> CaptureAsync(Func<Task<PaymentResponse>> action)
    {
        try { await action(); return null; } catch (Exception exception) { return exception; }
    }

    private static async Task<Exception?> CaptureRefundAsync(Func<Task<PaymentRefundResponse>> action)
    {
        try { await action(); return null; } catch (Exception exception) { return exception; }
    }

    private sealed class TestUser(bool administrator) : ICurrentUserService
    {
        public Guid? UserId => null;
        public string? Username => "test";
        public IReadOnlyCollection<string> Roles => [];
        public IReadOnlyCollection<string> Permissions => [];
        public Guid? BranchId => null;
        public bool IsAdministrator => administrator;
    }

    private sealed class TestAudit : IAuditWriter
    {
        public Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}