using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class KitchenController(
    IKitchenService service,
    IValidator<CreateKitchenStationRequest> createValidator,
    IValidator<UpdateKitchenStationRequest> updateValidator) : ControllerBase
{
    [HttpGet("branches/{branchId:guid}/kitchen-stations"), RequirePermission("kitchen.station.read")]
    public async Task<IActionResult> GetStations(Guid branchId, CancellationToken ct) => Ok(await service.GetStationsAsync(branchId, ct));

    [HttpGet("kitchen-stations/{id:guid}"), RequirePermission("kitchen.station.read")]
    public async Task<IActionResult> GetStation(Guid id, CancellationToken ct) => (await service.GetStationAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("branches/{branchId:guid}/kitchen-stations"), RequirePermission("kitchen.station.create")]
    public async Task<IActionResult> CreateStation(Guid branchId, CreateKitchenStationRequest request, CancellationToken ct)
    {
        var validation = await createValidator.ValidateAsync(request, ct); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        return Ok(await service.CreateStationAsync(branchId, request, ct));
    }

    [HttpPut("kitchen-stations/{id:guid}"), RequirePermission("kitchen.station.update")]
    public async Task<IActionResult> UpdateStation(Guid id, UpdateKitchenStationRequest request, CancellationToken ct)
    {
        var validation = await updateValidator.ValidateAsync(request, ct); if (!validation.IsValid) return BadRequest(new ValidationProblemDetails(validation.ToDictionary()));
        return (await service.UpdateStationAsync(id, request, ct)) is { } result ? Ok(result) : NotFound();
    }

    [HttpGet("kitchen-stations/{id:guid}/products"), RequirePermission("kitchen.station.read")]
    public async Task<IActionResult> GetProducts(Guid id, CancellationToken ct) => Ok(await service.GetStationProductsAsync(id, ct));

    [HttpPut("kitchen-stations/{id:guid}/products"), RequirePermission("kitchen.station.update")]
    public async Task<IActionResult> SetProducts(Guid id, KitchenStationProductRequest request, CancellationToken ct) => Ok(await service.SetStationProductsAsync(id, request, ct));

    [HttpGet("branches/{branchId:guid}/kitchen/orders"), RequirePermission("kitchen.order.read")]
    public async Task<IActionResult> GetOrders(Guid branchId, [FromQuery] Guid? stationId, [FromQuery] KitchenOrderStatus? status, CancellationToken ct) => Ok(await service.GetBranchOrdersAsync(branchId, stationId, status, ct));

    [HttpGet("kitchen/orders/{id:guid}"), RequirePermission("kitchen.order.read")]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct) => (await service.GetOrderAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost("kitchen/orders/{id:guid}/accept"), RequirePermission("kitchen.order.change_status")]
    public Task<IActionResult> Accept(Guid id, KitchenOrderStatusRequest request, CancellationToken ct) => Change(id, KitchenOrderStatus.Accepted, request, ct);
    [HttpPost("kitchen/orders/{id:guid}/start"), RequirePermission("kitchen.order.change_status")]
    public Task<IActionResult> Start(Guid id, KitchenOrderStatusRequest request, CancellationToken ct) => Change(id, KitchenOrderStatus.Preparing, request, ct);
    [HttpPost("kitchen/orders/{id:guid}/ready"), RequirePermission("kitchen.order.change_status")]
    public Task<IActionResult> Ready(Guid id, KitchenOrderStatusRequest request, CancellationToken ct) => Change(id, KitchenOrderStatus.Ready, request, ct);
    [HttpPost("kitchen/orders/{id:guid}/complete"), RequirePermission("kitchen.order.change_status")]
    public Task<IActionResult> Complete(Guid id, KitchenOrderStatusRequest request, CancellationToken ct) => Change(id, KitchenOrderStatus.Completed, request, ct);
    [HttpPost("kitchen/orders/{id:guid}/cancel"), RequirePermission("kitchen.order.change_status")]
    public Task<IActionResult> Cancel(Guid id, KitchenOrderStatusRequest request, CancellationToken ct) => Change(id, KitchenOrderStatus.Cancelled, request, ct);

    private async Task<IActionResult> Change(Guid id, KitchenOrderStatus status, KitchenOrderStatusRequest request, CancellationToken ct) => (await service.ChangeStatusAsync(id, status, request, ct)) is { } result ? Ok(result) : NotFound();
}