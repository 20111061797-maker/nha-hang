namespace RestaurantManagement.Application.Features.Inventory;

public sealed class InventoryItemDto
{
    public Guid Id { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public Guid IngredientId { get; set; }
    public string IngredientCode { get; set; } = string.Empty;
    public string IngredientName { get; set; } = string.Empty;
    public Guid UnitId { get; set; }
    public string UnitName { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal CurrentQuantity { get; set; }
    public decimal AverageUnitCost { get; set; }
    public decimal TotalValue { get; set; }
    public decimal MinStockThreshold { get; set; } = 10;
    public string StockStatus { get; set; } = "InStock"; // InStock, LowStock, OutOfStock
    public bool IsActive { get; set; }
    public DateTimeOffset LastUpdated { get; set; }
}

public sealed class InventorySummaryDto
{
    public int TotalItems { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
}

public sealed class InventoryTransactionDto
{
    public Guid Id { get; set; }
    public Guid InventoryItemId { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public string UnitName { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty; // Receipt, Issue, Adjustment, Count
    public decimal QuantityDelta { get; set; }
    public decimal UnitCost { get; set; }
    public decimal QuantityBefore { get; set; }
    public decimal QuantityAfter { get; set; }
    public string? Reason { get; set; }
    public string? PerformedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateInventoryItemRequest
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string UnitName { get; set; } = string.Empty;
    public decimal InitialQuantity { get; set; }
    public decimal InitialCost { get; set; }
    public decimal? MinStockThreshold { get; set; }
}

public sealed class AdjustInventoryRequest
{
    public Guid InventoryItemId { get; set; }
    public string Type { get; set; } = "RECEIPT"; // RECEIPT, ISSUE, COUNT
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string? Reason { get; set; }
}

public interface IInventoryManagementService
{
    Task<InventorySummaryDto> GetSummaryAsync(Guid branchId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryItemDto>> GetItemsAsync(Guid branchId, string? search, string? status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(Guid branchId, Guid? inventoryItemId, int limit = 50, CancellationToken cancellationToken = default);
    Task<InventoryItemDto> CreateItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken = default);
    Task<InventoryItemDto> AdjustStockAsync(AdjustInventoryRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetCommonUnitsAsync(CancellationToken cancellationToken = default);
}
