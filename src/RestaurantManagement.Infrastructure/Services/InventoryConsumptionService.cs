using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Inventory;
using RestaurantManagement.Application.Features.Recipes;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Common;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class InventoryConsumptionService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IInventoryConsumptionService
{
    public async Task<InventoryDeductionResult> DeductForKitchenOrderAsync(Guid kitchenOrderId, CancellationToken cancellationToken = default)
    {
        var kitchenOrder = await dbContext.KitchenOrders
            .FirstOrDefaultAsync(x => x.Id == kitchenOrderId, cancellationToken);

        if (kitchenOrder == null)
        {
            return new InventoryDeductionResult(false, 0, 0, [], ["Không tìm thấy phiếu bếp."]);
        }

        var items = await dbContext.KitchenOrderItems
            .Where(x => x.KitchenOrderId == kitchenOrderId)
            .ToListAsync(cancellationToken);

        if (items.Count == 0)
        {
            return new InventoryDeductionResult(true, 0, 0, [], []);
        }

        var warehouse = await EnsureWarehouseForBranchAsync(kitchenOrder.BranchId, cancellationToken);
        var deductedItems = new List<string>();
        var warnings = new List<string>();
        var transactionsCreated = 0;
        var itemsProcessed = 0;

        foreach (var kItem in items)
        {
            // Idempotency: skip if already deducted for this kitchen order item
            var alreadyDeducted = await dbContext.InventoryTransactions
                .AnyAsync(t => t.ReferenceType == InventoryReferenceType.Order && t.ReferenceId == kItem.Id, cancellationToken);

            if (alreadyDeducted)
            {
                continue;
            }

            var itemDeduction = await DeductItemInternalAsync(kItem, kitchenOrder, warehouse, cancellationToken);
            itemsProcessed++;
            transactionsCreated += itemDeduction.TransactionsCreated;
            deductedItems.AddRange(itemDeduction.DeductedItems);
            warnings.AddRange(itemDeduction.Warnings);
        }

        if (transactionsCreated > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await auditWriter.WriteAsync("KitchenOrderInventoryDeducted", nameof(KitchenOrder), kitchenOrderId, currentUser.Username, null, cancellationToken);
        }

        return new InventoryDeductionResult(true, itemsProcessed, transactionsCreated, deductedItems, warnings);
    }

    public async Task<InventoryDeductionResult> DeductForKitchenOrderItemAsync(Guid kitchenOrderItemId, CancellationToken cancellationToken = default)
    {
        var kItem = await dbContext.KitchenOrderItems
            .FirstOrDefaultAsync(x => x.Id == kitchenOrderItemId, cancellationToken);

        if (kItem == null)
        {
            return new InventoryDeductionResult(false, 0, 0, [], ["Không tìm thấy món chế biến."]);
        }

        var kitchenOrder = await dbContext.KitchenOrders
            .FirstOrDefaultAsync(x => x.Id == kItem.KitchenOrderId, cancellationToken);

        if (kitchenOrder == null)
        {
            return new InventoryDeductionResult(false, 0, 0, [], ["Không tìm thấy phiếu bếp liên quan."]);
        }

        // Idempotency check
        var alreadyDeducted = await dbContext.InventoryTransactions
            .AnyAsync(t => t.ReferenceType == InventoryReferenceType.Order && t.ReferenceId == kItem.Id, cancellationToken);

        if (alreadyDeducted)
        {
            return new InventoryDeductionResult(true, 0, 0, [], [$"Món '{kItem.ProductNameSnapshot}' đã được trừ kho trước đó."]);
        }

        var warehouse = await EnsureWarehouseForBranchAsync(kitchenOrder.BranchId, cancellationToken);
        var result = await DeductItemInternalAsync(kItem, kitchenOrder, warehouse, cancellationToken);

        if (result.TransactionsCreated > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await auditWriter.WriteAsync("KitchenOrderItemInventoryDeducted", nameof(KitchenOrderItem), kitchenOrderItemId, currentUser.Username, null, cancellationToken);
        }

        return new InventoryDeductionResult(true, 1, result.TransactionsCreated, result.DeductedItems, result.Warnings);
    }

    public async Task<InventoryDeductionResult> RecordWasteAsync(RecordWasteRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Quantity <= 0)
        {
            throw new ApplicationException("Số lượng hao hụt phải lớn hơn 0.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ApplicationException("Vui lòng nhập lý do hao hụt/làm hỏng.");
        }

        var warehouse = await EnsureWarehouseForBranchAsync(request.BranchId, cancellationToken);
        var deductedItems = new List<string>();
        var warnings = new List<string>();
        var transactionsCreated = 0;

        if (request.IngredientId.HasValue && request.IngredientId.Value != Guid.Empty)
        {
            var ing = await dbContext.Ingredients.FindAsync([request.IngredientId.Value], cancellationToken);
            if (ing == null) throw new ApplicationException("Nguyên liệu không tồn tại.");

            var invItem = await EnsureInventoryItemAsync(warehouse.Id, ing.Id, ing.BaseUnitId, cancellationToken);
            var balance = await EnsureInventoryBalanceAsync(invItem.Id, cancellationToken);

            var beforeQty = balance.Quantity;
            var afterQty = beforeQty - request.Quantity;
            balance.Quantity = afterQty;
            balance.Version++;

            var tx = new InventoryTransaction
            {
                InventoryItemId = invItem.Id,
                CreatedBy = currentUser.UserId,
                TransactionType = InventoryTransactionType.Issue,
                QuantityDelta = -request.Quantity,
                UnitCost = balance.AverageUnitCost,
                QuantityBefore = beforeQty,
                QuantityAfter = afterQty,
                ReferenceType = request.KitchenOrderId.HasValue ? InventoryReferenceType.Order : InventoryReferenceType.ManualAdjustment,
                ReferenceId = request.KitchenOrderId,
                Reason = $"Hao hụt/hỏng: {request.Reason}"
            };

            dbContext.InventoryTransactions.Add(tx);
            transactionsCreated++;
            deductedItems.Add($"{ing.Name}: -{request.Quantity:0.##}");
        }
        else if (request.ProductId.HasValue && request.ProductId.Value != Guid.Empty)
        {
            var product = await dbContext.Products.FindAsync([request.ProductId.Value], cancellationToken);
            if (product == null) throw new ApplicationException("Món ăn không tồn tại.");

            var recipe = await dbContext.Recipes
                .FirstOrDefaultAsync(r => r.ProductId == product.Id && r.ProductVariantId == null && r.IsActive, cancellationToken);

            if (recipe == null)
            {
                throw new ApplicationException($"Món '{product.Name}' chưa có công thức nguyên liệu để tính hao hụt.");
            }

            var activeVersion = await dbContext.RecipeVersions
                .Where(v => v.RecipeId == recipe.Id && v.IsActive)
                .OrderByDescending(v => v.VersionNumber)
                .FirstOrDefaultAsync(cancellationToken);

            if (activeVersion == null)
            {
                throw new ApplicationException($"Công thức món '{product.Name}' chưa có phiên bản kích hoạt.");
            }

            var recipeItems = await dbContext.RecipeItems
                .Where(i => i.RecipeVersionId == activeVersion.Id)
                .ToListAsync(cancellationToken);

            foreach (var rItem in recipeItems)
            {
                var ing = await dbContext.Ingredients.FindAsync([rItem.IngredientId], cancellationToken);
                if (ing == null) continue;

                var invItem = await EnsureInventoryItemAsync(warehouse.Id, ing.Id, ing.BaseUnitId, cancellationToken);
                var balance = await EnsureInventoryBalanceAsync(invItem.Id, cancellationToken);

                var recipeUnit = await dbContext.Units.FindAsync([rItem.UnitId], cancellationToken);
                var invUnit = await dbContext.Units.FindAsync([invItem.UnitId], cancellationToken);

                var effectiveQty = rItem.Quantity * (1 + rItem.WastePercentage / 100m) * request.Quantity;
                var convertedDeduction = UnitConversionHelper.ConvertQuantity(effectiveQty, recipeUnit?.Name ?? "", invUnit?.Name ?? "");

                var beforeQty = balance.Quantity;
                var afterQty = beforeQty - convertedDeduction;
                balance.Quantity = afterQty;
                balance.Version++;

                var tx = new InventoryTransaction
                {
                    InventoryItemId = invItem.Id,
                    CreatedBy = currentUser.UserId,
                    TransactionType = InventoryTransactionType.Issue,
                    QuantityDelta = -convertedDeduction,
                    UnitCost = balance.AverageUnitCost,
                    QuantityBefore = beforeQty,
                    QuantityAfter = afterQty,
                    ReferenceType = request.KitchenOrderId.HasValue ? InventoryReferenceType.Order : InventoryReferenceType.ManualAdjustment,
                    ReferenceId = request.KitchenOrderId,
                    Reason = $"Hao hụt hỏng món ({product.Name} x {request.Quantity}): {request.Reason}"
                };

                dbContext.InventoryTransactions.Add(tx);
                transactionsCreated++;
                deductedItems.Add($"{ing.Name}: -{convertedDeduction:0.##} {invUnit?.Name}");
            }
        }
        else
        {
            throw new ApplicationException("Vui lòng chỉ định nguyên liệu hoặc món ăn bị hao hụt.");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditWriter.WriteAsync("InventoryWasteRecorded", nameof(InventoryTransaction), Guid.Empty, currentUser.Username, null, cancellationToken);

        return new InventoryDeductionResult(true, 1, transactionsCreated, deductedItems, warnings);
    }

    public async Task<InventoryDeductionResult> RecordReCookAsync(RecordReCookRequest request, CancellationToken cancellationToken = default)
    {
        var kItem = await dbContext.KitchenOrderItems
            .FirstOrDefaultAsync(x => x.Id == request.KitchenOrderItemId, cancellationToken);

        if (kItem == null)
        {
            throw new ApplicationException("Không tìm thấy món chế biến để làm lại.");
        }

        var kitchenOrder = await dbContext.KitchenOrders
            .FirstOrDefaultAsync(x => x.Id == request.KitchenOrderId, cancellationToken);

        if (kitchenOrder == null)
        {
            throw new ApplicationException("Không tìm thấy phiếu bếp.");
        }

        var warehouse = await EnsureWarehouseForBranchAsync(kitchenOrder.BranchId, cancellationToken);

        // Find active recipe
        var recipe = await dbContext.Recipes
            .Where(r => r.ProductId == kItem.ProductId && r.IsActive)
            .Where(r => kItem.ProductVariantId.HasValue ? r.ProductVariantId == kItem.ProductVariantId : r.ProductVariantId == null)
            .FirstOrDefaultAsync(cancellationToken);

        if (recipe == null && kItem.ProductVariantId.HasValue)
        {
            recipe = await dbContext.Recipes
                .FirstOrDefaultAsync(r => r.ProductId == kItem.ProductId && r.ProductVariantId == null && r.IsActive, cancellationToken);
        }

        if (recipe == null)
        {
            return new InventoryDeductionResult(false, 0, 0, [], [$"Món '{kItem.ProductNameSnapshot}' chưa có công thức để trừ tiêu hao làm lại."]);
        }

        var activeVersion = await dbContext.RecipeVersions
            .Where(v => v.RecipeId == recipe.Id && v.IsActive)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeVersion == null)
        {
            return new InventoryDeductionResult(false, 0, 0, [], [$"Công thức món '{kItem.ProductNameSnapshot}' chưa có phiên bản kích hoạt."]);
        }

        var recipeItems = await dbContext.RecipeItems
            .Where(i => i.RecipeVersionId == activeVersion.Id)
            .ToListAsync(cancellationToken);

        var deductedItems = new List<string>();
        var warnings = new List<string>();
        var transactionsCreated = 0;
        var reCookReferenceId = Guid.NewGuid();

        foreach (var rItem in recipeItems)
        {
            var ing = await dbContext.Ingredients.FindAsync([rItem.IngredientId], cancellationToken);
            if (ing == null) continue;

            var invItem = await EnsureInventoryItemAsync(warehouse.Id, ing.Id, ing.BaseUnitId, cancellationToken);
            var balance = await EnsureInventoryBalanceAsync(invItem.Id, cancellationToken);

            var recipeUnit = await dbContext.Units.FindAsync([rItem.UnitId], cancellationToken);
            var invUnit = await dbContext.Units.FindAsync([invItem.UnitId], cancellationToken);

            var effectiveQty = rItem.Quantity * (1 + rItem.WastePercentage / 100m) * kItem.Quantity;
            var convertedDeduction = UnitConversionHelper.ConvertQuantity(effectiveQty, recipeUnit?.Name ?? "", invUnit?.Name ?? "");

            var beforeQty = balance.Quantity;
            var afterQty = beforeQty - convertedDeduction;

            if (afterQty < 0)
            {
                warnings.Add($"Nguyên liệu '{ing.Name}' tồn kho âm sau khi làm lại ({afterQty:0.##} {invUnit?.Name}).");
            }

            balance.Quantity = afterQty;
            balance.Version++;

            var tx = new InventoryTransaction
            {
                InventoryItemId = invItem.Id,
                CreatedBy = currentUser.UserId,
                TransactionType = InventoryTransactionType.Issue,
                QuantityDelta = -convertedDeduction,
                UnitCost = balance.AverageUnitCost,
                QuantityBefore = beforeQty,
                QuantityAfter = afterQty,
                ReferenceType = InventoryReferenceType.Order,
                ReferenceId = reCookReferenceId,
                Reason = $"Làm lại món: {kItem.ProductNameSnapshot} x {kItem.Quantity}. Lý do: {request.Reason}"
            };

            dbContext.InventoryTransactions.Add(tx);
            transactionsCreated++;
            deductedItems.Add($"{ing.Name}: -{convertedDeduction:0.##} {invUnit?.Name}");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditWriter.WriteAsync("KitchenOrderReCookDeducted", nameof(KitchenOrderItem), kItem.Id, currentUser.Username, null, cancellationToken);

        return new InventoryDeductionResult(true, 1, transactionsCreated, deductedItems, warnings);
    }

    private async Task<(int TransactionsCreated, List<string> DeductedItems, List<string> Warnings)> DeductItemInternalAsync(
        KitchenOrderItem kItem,
        KitchenOrder kitchenOrder,
        Warehouse warehouse,
        CancellationToken cancellationToken)
    {
        var deductedItems = new List<string>();
        var warnings = new List<string>();
        var transactionsCreated = 0;

        var recipe = await dbContext.Recipes
            .Where(r => r.ProductId == kItem.ProductId && r.IsActive)
            .Where(r => kItem.ProductVariantId.HasValue ? r.ProductVariantId == kItem.ProductVariantId : r.ProductVariantId == null)
            .FirstOrDefaultAsync(cancellationToken);

        if (recipe == null && kItem.ProductVariantId.HasValue)
        {
            recipe = await dbContext.Recipes
                .FirstOrDefaultAsync(r => r.ProductId == kItem.ProductId && r.ProductVariantId == null && r.IsActive, cancellationToken);
        }

        if (recipe == null)
        {
            warnings.Add($"Món '{kItem.ProductNameSnapshot}' chưa thiết lập công thức nguyên liệu.");
            return (0, deductedItems, warnings);
        }

        var activeVersion = await dbContext.RecipeVersions
            .Where(v => v.RecipeId == recipe.Id && v.IsActive)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeVersion == null)
        {
            warnings.Add($"Món '{kItem.ProductNameSnapshot}' chưa có phiên bản công thức kích hoạt.");
            return (0, deductedItems, warnings);
        }

        var recipeItems = await dbContext.RecipeItems
            .Where(i => i.RecipeVersionId == activeVersion.Id)
            .ToListAsync(cancellationToken);

        foreach (var rItem in recipeItems)
        {
            var ing = await dbContext.Ingredients.FindAsync([rItem.IngredientId], cancellationToken);
            if (ing == null) continue;

            var invItem = await EnsureInventoryItemAsync(warehouse.Id, ing.Id, ing.BaseUnitId, cancellationToken);
            var balance = await EnsureInventoryBalanceAsync(invItem.Id, cancellationToken);

            var recipeUnit = await dbContext.Units.FindAsync([rItem.UnitId], cancellationToken);
            var invUnit = await dbContext.Units.FindAsync([invItem.UnitId], cancellationToken);

            var effectiveQty = rItem.Quantity * (1 + rItem.WastePercentage / 100m) * kItem.Quantity;
            var convertedDeduction = UnitConversionHelper.ConvertQuantity(effectiveQty, recipeUnit?.Name ?? "", invUnit?.Name ?? "");

            var beforeQty = balance.Quantity;
            var afterQty = beforeQty - convertedDeduction;

            if (afterQty < 0)
            {
                warnings.Add($"Nguyên liệu '{ing.Name}' không đủ tồn kho (còn {beforeQty:0.##}, cần {convertedDeduction:0.##} {invUnit?.Name}).");
            }

            balance.Quantity = afterQty;
            balance.Version++;

            var tx = new InventoryTransaction
            {
                InventoryItemId = invItem.Id,
                CreatedBy = currentUser.UserId,
                TransactionType = InventoryTransactionType.Issue,
                QuantityDelta = -convertedDeduction,
                UnitCost = balance.AverageUnitCost,
                QuantityBefore = beforeQty,
                QuantityAfter = afterQty,
                ReferenceType = InventoryReferenceType.Order,
                ReferenceId = kItem.Id,
                Reason = $"Tiêu hao chế biến: {kItem.ProductNameSnapshot} x {kItem.Quantity} (Bàn: {kitchenOrder.TableNumberSnapshot ?? "-"}, Đơn: {kitchenOrder.OrderNumberSnapshot})"
            };

            dbContext.InventoryTransactions.Add(tx);
            transactionsCreated++;
            deductedItems.Add($"{ing.Name}: -{convertedDeduction:0.##} {invUnit?.Name}");
        }

        return (transactionsCreated, deductedItems, warnings);
    }

    private async Task<Warehouse> EnsureWarehouseForBranchAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var warehouse = await dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.BranchId == branchId && w.IsActive, cancellationToken);

        if (warehouse != null) return warehouse;

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

    private async Task<InventoryItem> EnsureInventoryItemAsync(Guid warehouseId, Guid ingredientId, Guid defaultUnitId, CancellationToken cancellationToken)
    {
        var item = await dbContext.InventoryItems
            .FirstOrDefaultAsync(i => i.WarehouseId == warehouseId && i.IngredientId == ingredientId && i.IsActive, cancellationToken);

        if (item != null) return item;

        item = new InventoryItem
        {
            WarehouseId = warehouseId,
            IngredientId = ingredientId,
            UnitId = defaultUnitId,
            IsActive = true
        };

        dbContext.InventoryItems.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);
        return item;
    }

    private async Task<InventoryBalance> EnsureInventoryBalanceAsync(Guid inventoryItemId, CancellationToken cancellationToken)
    {
        var balance = await dbContext.InventoryBalances
            .FirstOrDefaultAsync(b => b.InventoryItemId == inventoryItemId, cancellationToken);

        if (balance != null) return balance;

        balance = new InventoryBalance
        {
            InventoryItemId = inventoryItemId,
            Quantity = 0m,
            AverageUnitCost = 0m,
            Version = 1
        };

        dbContext.InventoryBalances.Add(balance);
        await dbContext.SaveChangesAsync(cancellationToken);
        return balance;
    }
}
