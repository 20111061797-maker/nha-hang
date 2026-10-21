using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Inventory;
using RestaurantManagement.Application.Features.Recipes;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public sealed class InventoryController(
    IInventoryManagementService service,
    IInventoryConsumptionService consumptionService) : ControllerBase
{
    [HttpGet("summary")]
    [RequirePermission("inventory.read")]
    public async Task<IActionResult> GetSummary([FromQuery] Guid branchId, CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            return BadRequest(new { message = "BranchId là bắt buộc." });

        return Ok(await service.GetSummaryAsync(branchId, ct));
    }

    [HttpGet("items")]
    [RequirePermission("inventory.read")]
    public async Task<IActionResult> GetItems([FromQuery] Guid branchId, [FromQuery] string? search, [FromQuery] string? status, CancellationToken ct)
    {
        if (branchId == Guid.Empty)
            return BadRequest(new { message = "BranchId là bắt buộc." });

        return Ok(await service.GetItemsAsync(branchId, search, status, ct));
    }

    [HttpGet("transactions")]
    [RequirePermission("inventory.read")]
    public async Task<IActionResult> GetTransactions([FromQuery] Guid branchId, [FromQuery] Guid? inventoryItemId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        if (branchId == Guid.Empty)
            return BadRequest(new { message = "BranchId là bắt buộc." });

        return Ok(await service.GetTransactionsAsync(branchId, inventoryItemId, limit, ct));
    }

    [HttpGet("units")]
    [RequirePermission("inventory.read")]
    public async Task<IActionResult> GetUnits(CancellationToken ct) =>
        Ok(await service.GetCommonUnitsAsync(ct));

    [HttpPost("items")]
    [RequirePermission("inventory.adjust")]
    public async Task<IActionResult> CreateItem([FromBody] CreateInventoryItemRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Tên mặt hàng/nguyên liệu là bắt buộc." });

        if (request.BranchId == Guid.Empty)
            return BadRequest(new { message = "BranchId là bắt buộc." });

        var result = await service.CreateItemAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("adjust")]
    [RequirePermission("inventory.adjust")]
    public async Task<IActionResult> AdjustStock([FromBody] AdjustInventoryRequest request, CancellationToken ct)
    {
        if (request.InventoryItemId == Guid.Empty)
            return BadRequest(new { message = "InventoryItemId là bắt buộc." });

        var result = await service.AdjustStockAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("waste")]
    [RequirePermission("inventory.adjust")]
    public async Task<IActionResult> RecordWaste([FromBody] RecordWasteRequest request, CancellationToken ct)
    {
        if (request.BranchId == Guid.Empty)
            return BadRequest(new { message = "BranchId là bắt buộc." });

        if (request.Quantity <= 0)
            return BadRequest(new { message = "Số lượng phải lớn hơn 0." });

        var result = await consumptionService.RecordWasteAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("re-cook")]
    [RequirePermission("inventory.adjust")]
    public async Task<IActionResult> RecordReCook([FromBody] RecordReCookRequest request, CancellationToken ct)
    {
        if (request.KitchenOrderId == Guid.Empty || request.KitchenOrderItemId == Guid.Empty)
            return BadRequest(new { message = "KitchenOrderId và KitchenOrderItemId là bắt buộc." });

        var result = await consumptionService.RecordReCookAsync(request, ct);
        return Ok(result);
    }
}
