using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Payments;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class PaymentsController(
    IPaymentService service,
    IValidator<CreatePaymentRequest> createValidator,
    IValidator<CreatePaymentRefundRequest> refundValidator) : ControllerBase
{
    [HttpPost("orders/{orderId:guid}/payments"), RequirePermission("payment.create")]
    public async Task<IActionResult> Create(Guid orderId, CreatePaymentRequest request, CancellationToken ct)
    {
        var validation = await createValidator.ValidateAsync(request, ct);
        if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        return Ok(await service.CreateAsync(orderId, request, ct));
    }

    [HttpGet("orders/{orderId:guid}/payments"), RequirePermission("payment.read")]
    public async Task<IActionResult> GetOrderPayments(Guid orderId, CancellationToken ct) => Ok(await service.GetOrderPaymentsAsync(orderId, ct));

    [HttpGet("payments/{id:guid}"), RequirePermission("payment.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => (await service.GetAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpGet("branches/{branchId:guid}/payments"), RequirePermission("payment.read")]
    public async Task<IActionResult> GetBranchPayments(Guid branchId, CancellationToken ct) => Ok(await service.GetBranchPaymentsAsync(branchId, ct));

    [HttpPost("payments/{id:guid}/complete"), RequirePermission("payment.complete")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct) => (await service.CompleteAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("payments/{id:guid}/cancel"), RequirePermission("payment.cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancelPaymentRequest request, CancellationToken ct) => string.IsNullOrWhiteSpace(request.Reason) ? BadRequest(new { message = "Cancellation reason is required." }) : (await service.CancelAsync(id, request, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("payments/{id:guid}/refund"), RequirePermission("payment.refund")]
    public async Task<IActionResult> Refund(Guid id, CreatePaymentRefundRequest request, CancellationToken ct)
    {
        var validation = await refundValidator.ValidateAsync(request, ct);
        if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        return Ok(await service.RefundAsync(id, request, ct));
    }

    [HttpGet("payments/{id:guid}/refunds"), RequirePermission("payment.read")]
    public async Task<IActionResult> GetRefunds(Guid id, CancellationToken ct) => Ok(await service.GetRefundsAsync(id, ct));

    [HttpGet("orders/{orderId:guid}/payment-summary"), RequirePermission("payment.read")]
    public async Task<IActionResult> GetSummary(Guid orderId, CancellationToken ct) => (await service.GetSummaryAsync(orderId, ct)) is { } result ? Ok(result) : NotFound();
}