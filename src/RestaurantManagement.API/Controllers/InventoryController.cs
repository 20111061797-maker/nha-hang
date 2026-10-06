using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Inventory;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public sealed class InventoryController(IInventoryManagementService service) : ControllerBase
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
}
