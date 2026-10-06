using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Inventory;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using AppException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class InventoryManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IInventoryManagementService
{
    private static readonly string[] DefaultUnits = ["kg", "g", "lon", "chai", "thùng", "hộp", "gói", "phần", "đĩa", "lít", "ml"];

    public async Task<InventorySummaryDto> GetSummaryAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var warehouse = await EnsureWarehouseForBranchAsync(branchId, cancellationToken);

        var query = from item in dbContext.InventoryItems
                    where item.WarehouseId == warehouse.Id && item.IsActive
                    join balance in dbContext.InventoryBalances on item.Id equals balance.InventoryItemId into balances
                    from balance in balances.DefaultIfEmpty()
                    select new
                    {
                        Quantity = balance != null ? balance.Quantity : 0m,
                        UnitCost = balance != null ? balance.AverageUnitCost : 0m
                    };

        var items = await query.ToListAsync(cancellationToken);

        var totalItems = items.Count;
        var totalValue = items.Sum(x => x.Quantity * x.UnitCost);
        var lowStockCount = items.Count(x => x.Quantity > 0 && x.Quantity <= 10m);
        var outOfStockCount = items.Count(x => x.Quantity <= 0);

        return new InventorySummaryDto
        {
            TotalItems = totalItems,
            TotalInventoryValue = totalValue,
            LowStockCount = lowStockCount,
            OutOfStockCount = outOfStockCount
        };
    }

    public async Task<IReadOnlyList<InventoryItemDto>> GetItemsAsync(Guid branchId, string? search, string? status, CancellationToken cancellationToken = default)
    {
        var warehouse = await EnsureWarehouseForBranchAsync(branchId, cancellationToken);

        var query = from item in dbContext.InventoryItems
                    where item.WarehouseId == warehouse.Id && item.IsActive
                    join ingredient in dbContext.Ingredients on item.IngredientId equals ingredient.Id
                    join unit in dbContext.Units on item.UnitId equals unit.Id
                    join balance in dbContext.InventoryBalances on item.Id equals balance.InventoryItemId into balances
                    from balance in balances.DefaultIfEmpty()
                    select new
                    {
                        item.Id,
                        item.WarehouseId,
                        WarehouseName = warehouse.Name,
                        item.IngredientId,
                        IngredientCode = ingredient.Code,
                        IngredientName = ingredient.Name,
                        item.UnitId,
                        UnitName = unit.Name,
                        UnitCode = unit.Code,
                        CurrentQuantity = balance != null ? balance.Quantity : 0m,
                        AverageUnitCost = balance != null ? balance.AverageUnitCost : 0m,
                        item.IsActive,
                        LastUpdated = balance != null ? balance.UpdatedAt : item.UpdatedAt
                    };

        var rawList = await query.ToListAsync(cancellationToken);

        var result = rawList.Select(x =>
        {
            const decimal minThreshold = 10m;
            var stockStatus = x.CurrentQuantity <= 0 ? "OutOfStock"
                : x.CurrentQuantity <= minThreshold ? "LowStock"
                : "InStock";

            return new InventoryItemDto
            {
                Id = x.Id,
                WarehouseId = x.WarehouseId,
                WarehouseName = x.WarehouseName,
                IngredientId = x.IngredientId,
                IngredientCode = x.IngredientCode,
                IngredientName = x.IngredientName,
                UnitId = x.UnitId,
                UnitName = x.UnitName,
                UnitCode = x.UnitCode,
                CurrentQuantity = x.CurrentQuantity,
                AverageUnitCost = x.AverageUnitCost,
                TotalValue = x.CurrentQuantity * x.AverageUnitCost,
                MinStockThreshold = minThreshold,
                StockStatus = stockStatus,
                IsActive = x.IsActive,
                LastUpdated = x.LastUpdated
            };
        });

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            result = result.Where(x =>
                x.IngredientName.ToLowerInvariant().Contains(s) ||
                x.IngredientCode.ToLowerInvariant().Contains(s) ||
                x.UnitName.ToLowerInvariant().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            result = result.Where(x => string.Equals(x.StockStatus, status, StringComparison.OrdinalIgnoreCase));
        }

        return result.OrderBy(x => x.IngredientName).ToList();
    }

    public async Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(Guid branchId, Guid? inventoryItemId, int limit = 50, CancellationToken cancellationToken = default)
    {
        var warehouse = await EnsureWarehouseForBranchAsync(branchId, cancellationToken);

        var query = from tx in dbContext.InventoryTransactions
                    join item in dbContext.InventoryItems on tx.InventoryItemId equals item.Id
                    where item.WarehouseId == warehouse.Id
                    join ingredient in dbContext.Ingredients on item.IngredientId equals ingredient.Id
                    join unit in dbContext.Units on item.UnitId equals unit.Id
                    join user in dbContext.Users on tx.CreatedBy equals user.Id into users
                    from user in users.DefaultIfEmpty()
                    select new
                    {
                        tx.Id,
                        tx.InventoryItemId,
                        IngredientName = ingredient.Name,
                        UnitName = unit.Name,
                        TransactionType = tx.TransactionType.ToString(),
                        tx.QuantityDelta,
                        tx.UnitCost,
                        tx.QuantityBefore,
                        tx.QuantityAfter,
                        tx.Reason,
                        PerformedBy = user != null ? user.Username : "Hệ thống",
                        tx.CreatedAt
                    };

        if (inventoryItemId.HasValue && inventoryItemId.Value != Guid.Empty)
        {
            query = query.Where(x => x.InventoryItemId == inventoryItemId.Value);
        }

        var list = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return list.Select(x => new InventoryTransactionDto
        {
            Id = x.Id,
            InventoryItemId = x.InventoryItemId,
            IngredientName = x.IngredientName,
            UnitName = x.UnitName,
            TransactionType = x.TransactionType,
            QuantityDelta = x.QuantityDelta,
            UnitCost = x.UnitCost,
            QuantityBefore = x.QuantityBefore,
            QuantityAfter = x.QuantityAfter,
            Reason = x.Reason,
            PerformedBy = x.PerformedBy,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public async Task<InventoryItemDto> CreateItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new AppException("Tên mặt hàng/nguyên liệu không được để trống.");
        }

        var branchExists = await dbContext.Branches.AnyAsync(x => x.Id == request.BranchId, cancellationToken);
        if (!branchExists)
        {
            throw new AppException("Chi nhánh không tồn tại.");
        }

        var warehouse = await EnsureWarehouseForBranchAsync(request.BranchId, cancellationToken);

        // Find or create Unit
        var unitName = string.IsNullOrWhiteSpace(request.UnitName) ? "kg" : request.UnitName.Trim();
        var unit = await dbContext.Units.FirstOrDefaultAsync(u => u.Name.ToLower() == unitName.ToLower() || u.Code.ToLower() == unitName.ToLower(), cancellationToken);
        if (unit == null)
        {
            unit = new Unit
            {
                Code = unitName.Length > 10 ? unitName[..10].ToUpperInvariant() : unitName.ToUpperInvariant(),
                Name = unitName,
                ConversionFactor = 1m
            };
            dbContext.Units.Add(unit);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Generate or validate ingredient code
        var code = request.Code?.Trim();
        if (string.IsNullOrWhiteSpace(code))
        {
            var count = await dbContext.Ingredients.CountAsync(cancellationToken);
            code = $"NL{(count + 1):D3}";
        }

        // Check duplicate code
        if (await dbContext.Ingredients.AnyAsync(i => i.Code.ToLower() == code.ToLower(), cancellationToken))
        {
            code = $"NL{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        }

        var ingredient = new Ingredient
        {
            BaseUnitId = unit.Id,
            Code = code,
            Name = request.Name.Trim(),
            IsActive = true
        };
        dbContext.Ingredients.Add(ingredient);
        await dbContext.SaveChangesAsync(cancellationToken);

        var inventoryItem = new InventoryItem
        {
            WarehouseId = warehouse.Id,
            IngredientId = ingredient.Id,
            UnitId = unit.Id,
            IsActive = true
        };
        dbContext.InventoryItems.Add(inventoryItem);
        await dbContext.SaveChangesAsync(cancellationToken);

        var initialQty = Math.Max(0m, request.InitialQuantity);
        var initialCost = Math.Max(0m, request.InitialCost);

        var balance = new InventoryBalance
        {
            InventoryItemId = inventoryItem.Id,
            Quantity = initialQty,
            AverageUnitCost = initialCost,
            Version = 1
        };
        dbContext.InventoryBalances.Add(balance);

        if (initialQty > 0)
        {
            dbContext.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryItemId = inventoryItem.Id,
                CreatedBy = currentUser.UserId,
                TransactionType = InventoryTransactionType.Receipt,
                QuantityDelta = initialQty,
                UnitCost = initialCost,
                QuantityBefore = 0m,
                QuantityAfter = initialQty,
                Reason = "Khởi tạo tồn kho ban đầu",
                ReferenceType = InventoryReferenceType.ManualAdjustment
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditWriter.WriteAsync("InventoryItemCreated", nameof(InventoryItem), inventoryItem.Id, currentUser.Username, null, cancellationToken);

        return new InventoryItemDto
        {
            Id = inventoryItem.Id,
            WarehouseId = warehouse.Id,
            WarehouseName = warehouse.Name,
            IngredientId = ingredient.Id,
            IngredientCode = ingredient.Code,
            IngredientName = ingredient.Name,
            UnitId = unit.Id,
            UnitName = unit.Name,
            UnitCode = unit.Code,
            CurrentQuantity = initialQty,
            AverageUnitCost = initialCost,
            TotalValue = initialQty * initialCost,
            MinStockThreshold = request.MinStockThreshold ?? 10m,
            StockStatus = initialQty <= 0 ? "OutOfStock" : initialQty <= (request.MinStockThreshold ?? 10m) ? "LowStock" : "InStock",
            IsActive = true,
            LastUpdated = DateTimeOffset.UtcNow
        };
    }

    public async Task<InventoryItemDto> AdjustStockAsync(AdjustInventoryRequest request, CancellationToken cancellationToken = default)
    {
        var item = await dbContext.InventoryItems
            .FirstOrDefaultAsync(x => x.Id == request.InventoryItemId, cancellationToken);

        if (item == null)
        {
            throw new AppException("Mặt hàng tồn kho không tồn tại.");
        }

        var ingredient = await dbContext.Ingredients.FindAsync([item.IngredientId], cancellationToken);
        var unit = await dbContext.Units.FindAsync([item.UnitId], cancellationToken);
        var warehouse = await dbContext.Warehouses.FindAsync([item.WarehouseId], cancellationToken);

        var balance = await dbContext.InventoryBalances
            .FirstOrDefaultAsync(b => b.InventoryItemId == item.Id, cancellationToken);

        if (balance == null)
        {
            balance = new InventoryBalance
            {
                InventoryItemId = item.Id,
                Quantity = 0m,
                AverageUnitCost = 0m,
                Version = 1
            };
            dbContext.InventoryBalances.Add(balance);
        }

        var beforeQty = balance.Quantity;
        var actionType = request.Type.Trim().ToUpperInvariant();

        switch (actionType)
        {
            case "RECEIPT":
            {
                if (request.Quantity <= 0)
                {
                    throw new AppException("Số lượng nhập kho phải lớn hơn 0.");
                }

                var delta = request.Quantity;
                var afterQty = beforeQty + delta;
                var unitCost = request.UnitCost ?? balance.AverageUnitCost;

                if (request.UnitCost.HasValue && request.UnitCost.Value > 0)
                {
                    var totalOldValue = beforeQty * balance.AverageUnitCost;
                    var addedValue = delta * request.UnitCost.Value;
                    balance.AverageUnitCost = afterQty > 0 ? (totalOldValue + addedValue) / afterQty : request.UnitCost.Value;
                }

                balance.Quantity = afterQty;
                balance.Version++;

                dbContext.InventoryTransactions.Add(new InventoryTransaction
                {
                    InventoryItemId = item.Id,
                    CreatedBy = currentUser.UserId,
                    TransactionType = InventoryTransactionType.Receipt,
                    QuantityDelta = delta,
                    UnitCost = unitCost,
                    QuantityBefore = beforeQty,
                    QuantityAfter = afterQty,
                    Reason = string.IsNullOrWhiteSpace(request.Reason) ? "Nhập thêm hàng vào kho" : request.Reason.Trim(),
                    ReferenceType = InventoryReferenceType.ManualAdjustment
                });
                break;
            }

            case "ISSUE":
            {
                if (request.Quantity <= 0)
                {
                    throw new AppException("Số lượng xuất kho phải lớn hơn 0.");
                }

                var delta = request.Quantity;
                if (beforeQty < delta)
                {
                    throw new AppException($"Số lượng tồn kho hiện tại ({beforeQty}) không đủ để xuất ({delta}).");
                }

                var afterQty = beforeQty - delta;
                balance.Quantity = afterQty;
                balance.Version++;

                dbContext.InventoryTransactions.Add(new InventoryTransaction
                {
                    InventoryItemId = item.Id,
                    CreatedBy = currentUser.UserId,
                    TransactionType = InventoryTransactionType.Issue,
                    QuantityDelta = -delta,
                    UnitCost = balance.AverageUnitCost,
                    QuantityBefore = beforeQty,
                    QuantityAfter = afterQty,
                    Reason = string.IsNullOrWhiteSpace(request.Reason) ? "Xuất kho / hao hụt" : request.Reason.Trim(),
                    ReferenceType = InventoryReferenceType.ManualAdjustment
                });
                break;
            }

            case "COUNT":
            {
                if (request.Quantity < 0)
                {
                    throw new AppException("Số lượng kiểm kê thực tế không được âm.");
                }

                var targetQty = request.Quantity;
                var delta = targetQty - beforeQty;
                balance.Quantity = targetQty;
                balance.Version++;

                dbContext.InventoryTransactions.Add(new InventoryTransaction
                {
                    InventoryItemId = item.Id,
                    CreatedBy = currentUser.UserId,
                    TransactionType = InventoryTransactionType.Count,
                    QuantityDelta = delta,
                    UnitCost = balance.AverageUnitCost,
                    QuantityBefore = beforeQty,
                    QuantityAfter = targetQty,
                    Reason = string.IsNullOrWhiteSpace(request.Reason) ? "Kiểm kê cân chỉnh số lượng thực tế" : request.Reason.Trim(),
                    ReferenceType = InventoryReferenceType.StockCount
                });
                break;
            }

            default:
                throw new AppException($"Loại thao tác không hợp lệ: {request.Type}. Phải là RECEIPT, ISSUE hoặc COUNT.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditWriter.WriteAsync($"InventoryStock{actionType}", nameof(InventoryBalance), balance.Id, currentUser.Username, null, cancellationToken);

        const decimal minThreshold = 10m;
        var currentQty = balance.Quantity;
        var status = currentQty <= 0 ? "OutOfStock" : currentQty <= minThreshold ? "LowStock" : "InStock";

        return new InventoryItemDto
        {
            Id = item.Id,
            WarehouseId = item.WarehouseId,
            WarehouseName = warehouse?.Name ?? "Kho chính",
            IngredientId = ingredient?.Id ?? Guid.Empty,
            IngredientCode = ingredient?.Code ?? "",
            IngredientName = ingredient?.Name ?? "",
            UnitId = unit?.Id ?? Guid.Empty,
            UnitName = unit?.Name ?? "",
            UnitCode = unit?.Code ?? "",
            CurrentQuantity = currentQty,
            AverageUnitCost = balance.AverageUnitCost,
            TotalValue = currentQty * balance.AverageUnitCost,
            MinStockThreshold = minThreshold,
            StockStatus = status,
            IsActive = item.IsActive,
            LastUpdated = DateTimeOffset.UtcNow
        };
    }

    public async Task<IReadOnlyList<string>> GetCommonUnitsAsync(CancellationToken cancellationToken = default)
    {
        var dbUnits = await dbContext.Units.Select(u => u.Name).ToListAsync(cancellationToken);
        var combined = DefaultUnits.Union(dbUnits, StringComparer.OrdinalIgnoreCase).Distinct().ToList();
        return combined;
    }

    private async Task<Warehouse> EnsureWarehouseForBranchAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var warehouse = await dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.BranchId == branchId && w.IsActive, cancellationToken);

        if (warehouse != null) return warehouse;

        // Auto-create default warehouse for branch
        var branch = await dbContext.Branches.FindAsync([branchId], cancellationToken);
        var branchName = branch?.Name ?? "Chi nhánh";

        warehouse = new Warehouse
        {
            BranchId = branchId,
            Name = $"Kho chính - {branchName}",
            IsActive = true
        };

        dbContext.Warehouses.Add(warehouse);
        await dbContext.SaveChangesAsync(cancellationToken);
        return warehouse;
    }
}
