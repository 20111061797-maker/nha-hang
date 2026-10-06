using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Modifiers;
using RestaurantManagement.Application.Features.Orders;
using RestaurantManagement.Application.Features.Pricing;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class OrderManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter,
    IProductPricingService productPricingService,
    IModifierComboService modifierComboService,
    IKitchenService? kitchenService = null) : IOrderService
{
    public async Task<OrderDetails> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(request.BranchId, cancellationToken);
        if (!await dbContext.Branches.AnyAsync(x => x.Id == request.BranchId && x.IsActive, cancellationToken)) throw new ApplicationException("Branch does not exist or is inactive.");
        DiningTable? table = null;
        if (request.OrderType == OrderType.DineIn)
        {
            if (request.DiningTableId is not Guid tableId) throw new ApplicationException("Dine-in orders require a table.");
            table = await EnsureTableAsync(request.BranchId, tableId, cancellationToken);
            if (await dbContext.OrderTableAllocations.AnyAsync(x => x.TableId == tableId && x.ReleasedAt == null && dbContext.Orders.Any(o => o.Id == x.OrderId && o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled), cancellationToken)) throw new ConflictException("The table already has an active order.");
        }

        var order = new Order { OrderNumber = await GenerateOrderNumberAsync(cancellationToken), BranchId = request.BranchId, DiningTableId = request.DiningTableId, CustomerId = request.CustomerId, CreatedBy = currentUser.UserId, OrderType = request.OrderType, Status = OrderStatus.Open, CustomerNameSnapshot = request.CustomerNameSnapshot, CustomerPhoneSnapshot = request.CustomerPhoneSnapshot, DeliveryAddressSnapshot = request.DeliveryAddressSnapshot, Notes = request.Notes, Version = 1 };
        dbContext.Orders.Add(order);
        dbContext.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = order.Id, OldStatus = OrderStatus.Draft, NewStatus = OrderStatus.Open, ChangedBy = currentUser.UserId, Note = "Order created" });
        if (table is not null)
        {
            table.Status = TableStatus.Occupied;
            dbContext.OrderTableAllocations.Add(new OrderTableAllocation { OrderId = order.Id, TableId = table.Id, AllocatedAt = DateTimeOffset.UtcNow });
        }
        await auditWriter.WriteAsync("OrderCreated", nameof(Order), order.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return await BuildDetailsAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDetails?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (order is null) return null; await EnsureBranchAccessAsync(order.BranchId, cancellationToken); return await BuildDetailsAsync(id, cancellationToken);
    }

    public async Task<IReadOnlyList<OrderListItem>> GetBranchOrdersAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        await ConsolidateDuplicateTableOrdersAsync(branchId, cancellationToken);
        return await dbContext.Orders.AsNoTracking().Where(x => x.BranchId == branchId).OrderByDescending(x => x.CreatedAt).Take(200).Select(x => new OrderListItem(x.Id, x.OrderNumber, x.BranchId, x.OrderType, x.Status, x.TotalAmount, x.CreatedAt, x.Version, x.DiningTableId)).ToListAsync(cancellationToken);
    }

    public async Task<OrderDetails?> AddItemAsync(Guid orderId, AddOrderItemRequest request, CancellationToken cancellationToken)
    {
        var order = await LoadEditableOrderAsync(orderId, request.ExpectedVersion, cancellationToken); var item = await BuildOrderItemAsync(order, request.ProductId, request.ProductVariantId, request.ComboId, request.Quantity, request.ModifierIds, request.Notes, cancellationToken); dbContext.OrderItems.Add(item); order.Version++; await auditWriter.WriteAsync("OrderItemAdded", nameof(OrderItem), item.Id, currentUser.Username, null, cancellationToken); await SaveAsync(cancellationToken); await RecalculateAsync(order, cancellationToken); await SaveAsync(cancellationToken); return await BuildDetailsAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDetails?> UpdateItemAsync(Guid orderId, Guid itemId, UpdateOrderItemRequest request, CancellationToken cancellationToken)
    {
        var order = await LoadEditableOrderAsync(orderId, request.ExpectedVersion, cancellationToken); var oldItem = await dbContext.OrderItems.FirstOrDefaultAsync(x => x.Id == itemId && x.OrderId == orderId, cancellationToken); if (oldItem is null) return null; dbContext.OrderItemModifiers.RemoveRange(await dbContext.OrderItemModifiers.Where(x => x.OrderItemId == itemId).ToListAsync(cancellationToken)); dbContext.OrderItems.Remove(oldItem); var item = await BuildOrderItemAsync(order, request.ProductId, request.ProductVariantId, request.ComboId, request.Quantity, request.ModifierIds, request.Notes, cancellationToken); dbContext.OrderItems.Add(item); order.Version++; await auditWriter.WriteAsync("OrderItemUpdated", nameof(OrderItem), itemId, currentUser.Username, null, cancellationToken); await SaveAsync(cancellationToken); await RecalculateAsync(order, cancellationToken); await SaveAsync(cancellationToken); return await BuildDetailsAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDetails?> RemoveItemAsync(Guid orderId, Guid itemId, long? expectedVersion, CancellationToken cancellationToken)
    {
        var order = await LoadEditableOrderAsync(orderId, expectedVersion, cancellationToken); if (order.Status is not (OrderStatus.Draft or OrderStatus.Open)) throw new ApplicationException("Items can only be removed from draft or open orders."); var item = await dbContext.OrderItems.FirstOrDefaultAsync(x => x.Id == itemId && x.OrderId == orderId, cancellationToken); if (item is null) return null; dbContext.OrderItemModifiers.RemoveRange(await dbContext.OrderItemModifiers.Where(x => x.OrderItemId == itemId).ToListAsync(cancellationToken)); dbContext.OrderItems.Remove(item); order.Version++; await auditWriter.WriteAsync("OrderItemRemoved", nameof(OrderItem), itemId, currentUser.Username, null, cancellationToken); await SaveAsync(cancellationToken); await RecalculateAsync(order, cancellationToken); await SaveAsync(cancellationToken); return await BuildDetailsAsync(order.Id, cancellationToken);
    }

    public async Task<OrderDetails?> ChangeStatusAsync(Guid orderId, ChangeOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken); 
        if (order is null) return null; 
        await EnsureBranchAccessAsync(order.BranchId, cancellationToken); 
        EnsureVersion(order, request.ExpectedVersion); 
        if (!AllowedTransition(order.Status, request.Status)) 
            throw new ApplicationException($"Cannot change order status from {order.Status} to {request.Status}."); 
        var old = order.Status; 
        order.Status = request.Status; 
        order.Version++; 
        dbContext.OrderStatusHistories.Add(new OrderStatusHistory { OrderId = orderId, OldStatus = old, NewStatus = request.Status, ChangedBy = currentUser.UserId, Note = request.Reason }); 
        if (request.Status is OrderStatus.Completed or OrderStatus.Cancelled) 
        {
            await ReleaseTableAsync(order, cancellationToken);
            var activeKitchenOrders = await dbContext.KitchenOrders
                .Where(ko => ko.OrderId == orderId && ko.Status != KitchenOrderStatus.Completed && ko.Status != KitchenOrderStatus.Cancelled)
                .ToListAsync(cancellationToken);
            foreach (var ko in activeKitchenOrders)
            {
                ko.Status = request.Status == OrderStatus.Completed ? KitchenOrderStatus.Completed : KitchenOrderStatus.Cancelled;
                ko.UpdatedAt = DateTimeOffset.UtcNow;
                ko.Version++;
            }
        }
        await auditWriter.WriteAsync("OrderStatusChanged", nameof(Order), orderId, currentUser.Username, null, cancellationToken); 
        await SaveAsync(cancellationToken); 
        if (request.Status == OrderStatus.Confirmed && kitchenService is not null) 
            await kitchenService.CreateForConfirmedOrderAsync(orderId, cancellationToken); 
        return await BuildDetailsAsync(orderId, cancellationToken);
    }

    public Task<OrderDetails?> CancelAsync(Guid orderId, CancelOrderRequest request, CancellationToken cancellationToken) => ChangeStatusAsync(orderId, new ChangeOrderStatusRequest(OrderStatus.Cancelled, request.Reason, request.ExpectedVersion), cancellationToken);

    private async Task<OrderItem> BuildOrderItemAsync(Order order, Guid? productId, Guid? variantId, Guid? comboId, decimal quantity, IReadOnlyList<Guid> modifierIds, string? notes, CancellationToken cancellationToken)
    {
        if (productId is Guid product)
        {
            await modifierComboService.ValidateSelectionsAsync(product, await BuildSelectionsAsync(product, modifierIds, cancellationToken), cancellationToken);
            var pricing = await productPricingService.CalculateAsync(new ProductPricingRequest(product, variantId, order.BranchId, modifierIds), cancellationToken);
            var productData = await dbContext.Products.AsNoTracking().FirstAsync(x => x.Id == product, cancellationToken); var variant = variantId is Guid v ? await dbContext.ProductVariants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == v, cancellationToken) : null;
            var item = new OrderItem { OrderId = order.Id, ProductId = product, ProductVariantId = variantId, ProductNameSnapshot = productData.Name, VariantNameSnapshot = variant?.Name, Quantity = quantity, UnitPrice = pricing.FinalUnitPrice, LineTotal = pricing.FinalUnitPrice * quantity, Notes = notes };
            await AddModifierSnapshotsAsync(item, modifierIds, product, cancellationToken); return item;
        }

        if (comboId is not Guid comboIdValue) throw new ApplicationException("A product or combo is required.");
        if (modifierIds.Count > 0) throw new ApplicationException("Modifier selection inside combos is not enabled yet.");
        var combo = await dbContext.Combos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == comboIdValue && x.IsActive, cancellationToken) ?? throw new ApplicationException("Combo does not exist or is inactive."); var comboItems = await dbContext.ComboItems.AsNoTracking().Where(x => x.ComboId == combo.Id).ToListAsync(cancellationToken); if (comboItems.Count == 0) throw new ApplicationException("Combo has no items."); var valid = await (from comboItem in dbContext.ComboItems join comboProduct in dbContext.Products on comboItem.ProductId equals comboProduct.Id join branchProduct in dbContext.BranchProducts on comboProduct.Id equals branchProduct.ProductId where comboItem.ComboId == combo.Id && comboProduct.IsActive && branchProduct.BranchId == order.BranchId && branchProduct.IsActive && branchProduct.IsAvailable select comboItem.Id).CountAsync(cancellationToken); if (valid != comboItems.Count) throw new ApplicationException("Combo contains unavailable items for this branch."); var first = comboItems[0]; var firstProduct = await dbContext.Products.AsNoTracking().FirstAsync(x => x.Id == first.ProductId, cancellationToken); return new OrderItem { OrderId = order.Id, ProductId = first.ProductId, ProductVariantId = first.ProductVariantId, ComboId = combo.Id, ProductNameSnapshot = firstProduct.Name, ComboNameSnapshot = combo.Name, Quantity = quantity, UnitPrice = combo.DefaultPrice, LineTotal = combo.DefaultPrice * quantity, Notes = notes };
    }

    private async Task<IReadOnlyList<ModifierSelection>> BuildSelectionsAsync(Guid productId, IReadOnlyList<Guid> modifierIds, CancellationToken cancellationToken)
    {
        var groups = await (from assignment in dbContext.ProductModifierGroups where assignment.ProductId == productId join modifier in dbContext.Modifiers on assignment.ModifierGroupId equals modifier.ModifierGroupId where modifierIds.Contains(modifier.Id) select new { modifier.ModifierGroupId, modifier.Id }).ToListAsync(cancellationToken); return groups.GroupBy(x => x.ModifierGroupId).Select(x => new ModifierSelection(x.Key, x.Select(y => y.Id).ToArray())).ToList();
    }

    private async Task AddModifierSnapshotsAsync(OrderItem item, IReadOnlyList<Guid> modifierIds, Guid productId, CancellationToken cancellationToken)
    {
        if (modifierIds.Count == 0) return; var modifiers = await (from modifier in dbContext.Modifiers.AsNoTracking() join option in dbContext.ProductModifierOptions.AsNoTracking() on new { ModifierId = modifier.Id, ProductId = productId } equals new { option.ModifierId, option.ProductId } into options from option in options.DefaultIfEmpty() where modifierIds.Contains(modifier.Id) select new { modifier.Id, modifier.Name, Price = option == null ? modifier.DefaultPrice : option.PriceOverride ?? modifier.DefaultPrice }).ToListAsync(cancellationToken); foreach (var modifier in modifiers) itemModifierAdd(item, modifier.Id, modifier.Name, modifier.Price);
    }

    private void itemModifierAdd(OrderItem item, Guid id, string name, decimal price) => dbContext.OrderItemModifiers.Add(new OrderItemModifier { OrderItemId = item.Id, ModifierId = id, ModifierNameSnapshot = name, Quantity = 1, UnitPrice = price, TotalPrice = price });
    private async Task<Order> LoadEditableOrderAsync(Guid id, long? expectedVersion, CancellationToken ct) { var order = await dbContext.Orders.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new ApplicationException("Order does not exist."); await EnsureBranchAccessAsync(order.BranchId, ct); EnsureVersion(order, expectedVersion); if (order.Status is not (OrderStatus.Draft or OrderStatus.Open)) throw new ApplicationException("Order items can only be changed while the order is open."); return order; }
    private static void EnsureVersion(Order order, long? expected) { if (expected.HasValue && order.Version != expected.Value) throw new ConflictException("The order was changed by another user."); }
    private async Task RecalculateAsync(Order order, CancellationToken ct) { order.Subtotal = await dbContext.OrderItems.Where(x => x.OrderId == order.Id).SumAsync(x => x.LineTotal, ct); order.DiscountAmount = 0; order.TaxAmount = 0; order.TotalAmount = order.Subtotal; }
    private async Task ReleaseTableAsync(Order order, CancellationToken ct) 
    { 
        var allocations = await dbContext.OrderTableAllocations.Where(x => x.OrderId == order.Id && x.ReleasedAt == null).ToListAsync(ct); 
        foreach (var allocation in allocations) 
        { 
            allocation.ReleasedAt = DateTimeOffset.UtcNow; 
            var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == allocation.TableId, ct); 
            if (table is not null) table.Status = TableStatus.Available; 
        } 
        if (order.DiningTableId.HasValue)
        {
            var directTable = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == order.DiningTableId.Value, ct);
            if (directTable is not null) directTable.Status = TableStatus.Available;
        }
    }
    private static bool AllowedTransition(OrderStatus from, OrderStatus to) => 
        from == to || (from, to) switch 
        { 
            (OrderStatus.Draft, OrderStatus.Open or OrderStatus.Cancelled) => true, 
            (OrderStatus.Open, OrderStatus.Confirmed or OrderStatus.Cancelled) => true, 
            (OrderStatus.Confirmed, OrderStatus.Preparing or OrderStatus.Ready or OrderStatus.Completed or OrderStatus.Cancelled) => true, 
            (OrderStatus.Preparing, OrderStatus.Ready or OrderStatus.Completed or OrderStatus.Cancelled) => true, 
            (OrderStatus.Ready, OrderStatus.Completed or OrderStatus.Cancelled) => true, 
            _ => false 
        };
    private async Task<DiningTable> EnsureTableAsync(Guid branchId, Guid tableId, CancellationToken ct) { var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == tableId && x.BranchId == branchId && x.IsActive, ct) ?? throw new ApplicationException("Table does not exist in this branch."); if (table.Status == TableStatus.OutOfService) throw new ApplicationException("Table is out of service."); return table; }
    private async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken ct) { if (currentUser.IsAdministrator) return; if (currentUser.UserId is not Guid userId || (!await dbContext.UserBranchAccesses.AnyAsync(x => x.UserId == userId && x.BranchId == branchId && x.IsActive, ct) && !await dbContext.Users.AnyAsync(x => x.Id == userId && x.EmployeeId != null && dbContext.Employees.Any(e => e.Id == x.EmployeeId && e.BranchId == branchId && e.IsActive), ct))) throw new ForbiddenException("You do not have access to this branch."); }
    private async Task<string> GenerateOrderNumberAsync(CancellationToken ct) { string number; do { number = $"ORD-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..27].ToUpperInvariant(); } while (await dbContext.Orders.AnyAsync(x => x.OrderNumber == number, ct)); return number; }
    private async Task SaveAsync(CancellationToken ct) { try { await dbContext.SaveChangesAsync(ct); } catch (DbUpdateConcurrencyException) { throw new ConflictException("The order was changed by another user."); } }
    private async Task ConsolidateDuplicateTableOrdersAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var activeOrders = await dbContext.Orders
            .Where(x => x.BranchId == branchId && x.DiningTableId != null && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var groups = activeOrders.GroupBy(x => x.DiningTableId!.Value).Where(g => g.Count() > 1).ToList();
        if (groups.Count == 0) return;

        foreach (var group in groups)
        {
            var primaryOrder = group.First();
            var duplicateOrders = group.Skip(1).ToList();
            var duplicateOrderIds = duplicateOrders.Select(d => d.Id).ToList();

            var itemsToMove = await dbContext.OrderItems
                .Where(i => duplicateOrderIds.Contains(i.OrderId))
                .ToListAsync(cancellationToken);

            foreach (var item in itemsToMove)
            {
                item.OrderId = primaryOrder.Id;
            }

            var duplicateAllocations = await dbContext.OrderTableAllocations
                .Where(a => duplicateOrderIds.Contains(a.OrderId) && a.ReleasedAt == null)
                .ToListAsync(cancellationToken);

            var now = DateTimeOffset.UtcNow;
            foreach (var alloc in duplicateAllocations)
            {
                alloc.ReleasedAt = now;
            }

            foreach (var dup in duplicateOrders)
            {
                dup.Status = OrderStatus.Cancelled;
                dup.Notes = string.IsNullOrWhiteSpace(dup.Notes)
                    ? $"[Đã tự động gộp vào đơn #{primaryOrder.OrderNumber}]"
                    : $"{dup.Notes} | [Đã gộp vào đơn #{primaryOrder.OrderNumber}]";
                dup.UpdatedAt = now;
                dup.Version++;
            }

            // Cancel any kitchen orders of duplicate orders (do NOT change OrderId to avoid unique index violation)
            var duplicateKitchenOrders = await dbContext.KitchenOrders
                .Where(ko => duplicateOrderIds.Contains(ko.OrderId) && ko.Status != KitchenOrderStatus.Cancelled)
                .ToListAsync(cancellationToken);

            foreach (var dko in duplicateKitchenOrders)
            {
                dko.Status = KitchenOrderStatus.Cancelled;
                dko.UpdatedAt = now;
                dko.Version++;
            }

            var totalItems = await dbContext.OrderItems
                .Where(i => i.OrderId == primaryOrder.Id)
                .ToListAsync(cancellationToken);

            primaryOrder.Subtotal = totalItems.Sum(i => i.LineTotal);
            primaryOrder.TotalAmount = primaryOrder.Subtotal + primaryOrder.TaxAmount - primaryOrder.DiscountAmount;
            primaryOrder.UpdatedAt = now;
            primaryOrder.Version++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<OrderDetails> BuildDetailsAsync(Guid id, CancellationToken ct) { var order = await dbContext.Orders.AsNoTracking().FirstAsync(x => x.Id == id, ct); var items = await dbContext.OrderItems.AsNoTracking().Where(x => x.OrderId == id).ToListAsync(ct); var modifiers = await dbContext.OrderItemModifiers.AsNoTracking().Where(x => items.Select(i => i.Id).Contains(x.OrderItemId)).ToListAsync(ct); return new OrderDetails(order.Id, order.OrderNumber, order.BranchId, order.OrderType, order.Status, order.DiningTableId, order.CustomerNameSnapshot, order.CustomerPhoneSnapshot, order.DeliveryAddressSnapshot, order.CurrencyCode, order.Notes, order.Subtotal, order.DiscountAmount, order.TaxAmount, order.TotalAmount, order.Version, order.CreatedAt, items.Select(item => new OrderItemDetails(item.Id, item.ProductId, item.ProductVariantId, item.ComboId, item.ProductNameSnapshot, item.VariantNameSnapshot, item.ComboNameSnapshot, item.Quantity, item.UnitPrice, item.LineTotal, item.Notes, modifiers.Where(m => m.OrderItemId == item.Id).Select(m => new OrderItemModifierDetails(m.Id, m.ModifierId, m.ModifierNameSnapshot, m.Quantity, m.UnitPrice, m.TotalPrice)).ToList())).ToList()); }
}