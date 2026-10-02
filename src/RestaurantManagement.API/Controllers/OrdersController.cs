using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Orders;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrdersController(
    IOrderService service,
    IValidator<CreateOrderRequest> createValidator,
    IValidator<AddOrderItemRequest> addItemValidator,
    IValidator<UpdateOrderItemRequest> updateItemValidator) : ControllerBase
{
    [HttpPost, RequirePermission("order.create")]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var validation = await createValidator.ValidateAsync(request, ct); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.CreateAsync(request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("{id:guid}"), RequirePermission("order.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => (await service.GetAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpGet("/api/branches/{branchId:guid}/orders"), RequirePermission("order.read")]
    public async Task<IActionResult> GetBranchOrders(Guid branchId, CancellationToken ct) => Ok(await service.GetBranchOrdersAsync(branchId, ct));

    [HttpPost("{orderId:guid}/items"), RequirePermission("order.add_item")]
    public async Task<IActionResult> AddItem(Guid orderId, AddOrderItemRequest request, CancellationToken ct)
    {
        var validation = await addItemValidator.ValidateAsync(request, ct); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.AddItemAsync(orderId, request, ct); return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{orderId:guid}/items/{itemId:guid}"), RequirePermission("order.update_item")]
    public async Task<IActionResult> UpdateItem(Guid orderId, Guid itemId, UpdateOrderItemRequest request, CancellationToken ct)
    {
        var validation = await updateItemValidator.ValidateAsync(request, ct); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        var result = await service.UpdateItemAsync(orderId, itemId, request, ct); return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{orderId:guid}/items/{itemId:guid}"), RequirePermission("order.remove_item")]
    public async Task<IActionResult> RemoveItem(Guid orderId, Guid itemId, [FromQuery] long? expectedVersion, CancellationToken ct) => (await service.RemoveItemAsync(orderId, itemId, expectedVersion, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPatch("{id:guid}/status"), RequirePermission("order.change_status")]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeOrderStatusRequest request, CancellationToken ct) => (await service.ChangeStatusAsync(id, request, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("{id:guid}/confirm"), RequirePermission("order.change_status")]
    public async Task<IActionResult> Confirm(Guid id, [FromQuery] long? expectedVersion, CancellationToken ct) => (await service.ChangeStatusAsync(id, new ChangeOrderStatusRequest(Domain.Enums.OrderStatus.Confirmed, "Confirmed", expectedVersion), ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("{id:guid}/complete"), RequirePermission("order.complete")]
    public async Task<IActionResult> Complete(Guid id, [FromQuery] long? expectedVersion, CancellationToken ct) => (await service.ChangeStatusAsync(id, new ChangeOrderStatusRequest(Domain.Enums.OrderStatus.Completed, "Completed", expectedVersion), ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("{id:guid}/cancel"), RequirePermission("order.cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancelOrderRequest request, CancellationToken ct) => string.IsNullOrWhiteSpace(request.Reason) ? BadRequest(new { message = "Cancellation reason is required." }) : (await service.CancelAsync(id, request, ct)) is { } result ? Ok(result) : NotFound();
}