using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Application.Features.Pricing;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.API.Controllers;

public sealed record PublicOrderItemRequest(
    Guid ProductId,
    Guid? ProductVariantId,
    IReadOnlyList<Guid>? ModifierIds,
    decimal Quantity,
    string? Notes);

public sealed record PublicCreateOrderRequest(
    Guid BranchId,
    Guid TableId,
    string? CustomerName,
    string? CustomerPhone,
    string? Notes,
    IReadOnlyList<PublicOrderItemRequest> Items);

public sealed record PublicOrderResponse(
    Guid OrderId,
    string OrderNumber,
    decimal TotalAmount,
    OrderStatus Status,
    string TableNumber,
    DateTimeOffset CreatedAt);

[ApiController]
[AllowAnonymous]
[Route("api/public")]
public sealed class PublicQrOrderController(
    RestaurantDbContext dbContext,
    IBranchManagementService branchService,
    IMenuManagementService menuService,
    IKitchenService kitchenService,
    IProductPricingService pricingService) : ControllerBase
{
    [HttpGet("tables/{identifierOrId}")]
    public async Task<IActionResult> GetTableInfo(string identifierOrId, CancellationToken ct) =>
        (await branchService.GetPublicTableAsync(identifierOrId, ct)) is { } result ? Ok(result) : NotFound(new { message = "Không tìm thấy bàn ăn hoặc mã QR không hợp lệ." });

    [HttpGet("branches/{branchId:guid}/menu")]
    public async Task<IActionResult> GetPublicMenu(Guid branchId, CancellationToken ct) =>
        Ok(await menuService.GetMenuAsync(branchId, ct));

    [HttpGet("tables/{tableId:guid}/active-bill")]
    public async Task<IActionResult> GetTableActiveBill(Guid tableId, CancellationToken ct)
    {
        var table = await dbContext.DiningTables.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tableId && t.IsActive, ct);
        if (table is null) return NotFound(new { message = "Bàn ăn không tồn tại." });

        var activeOrder = await dbContext.Orders.AsNoTracking()
            .Where(o => o.DiningTableId == tableId && o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled)
            .OrderBy(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (activeOrder is null)
            return Ok(new { hasActiveOrder = false, totalAmount = 0m, items = Array.Empty<object>() });

        var items = await dbContext.OrderItems.AsNoTracking()
            .Where(i => i.OrderId == activeOrder.Id)
            .OrderBy(i => i.CreatedAt)
            .Select(i => new
            {
                i.Id,
                i.ProductNameSnapshot,
                i.VariantNameSnapshot,
                i.Quantity,
                i.UnitPrice,
                i.LineTotal,
                i.Notes
            })
            .ToListAsync(ct);

        return Ok(new
        {
            hasActiveOrder = true,
            orderId = activeOrder.Id,
            orderNumber = activeOrder.OrderNumber,
            status = activeOrder.Status,
            totalAmount = activeOrder.TotalAmount,
            subtotal = activeOrder.Subtotal,
            createdAt = activeOrder.CreatedAt,
            items
        });
    }

    [HttpPost("orders")]
    public async Task<IActionResult> PlaceOrder(PublicCreateOrderRequest request, CancellationToken ct)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "Vui lòng chọn ít nhất 1 món ăn vào giỏ hàng." });

        var table = await dbContext.DiningTables.FirstOrDefaultAsync(t => t.Id == request.TableId && (request.BranchId == Guid.Empty || t.BranchId == request.BranchId) && t.IsActive, ct);
        if (table is null)
            return NotFound(new { message = "Bàn ăn không tồn tại hoặc đã ngừng hoạt động." });

        var effectiveBranchId = request.BranchId == Guid.Empty ? table.BranchId : request.BranchId;
        var branch = await dbContext.Branches.FirstOrDefaultAsync(b => b.Id == effectiveBranchId && b.IsActive, ct);
        if (branch is null)
            return NotFound(new { message = "Chi nhánh nhà hàng không tồn tại." });

        // Update table to Occupied
        table.Status = TableStatus.Occupied;

        // Check if table already has an active, unpaid order to accumulate into
        var existingOrder = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.DiningTableId == table.Id && o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled, ct);

        Order order;
        bool isNewOrder = false;

        if (existingOrder is not null)
        {
            // Accumulate onto current active order for this table
            order = existingOrder;
            if (order.Status == OrderStatus.Ready)
            {
                order.Status = OrderStatus.Confirmed;
            }
            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                order.Notes = string.IsNullOrWhiteSpace(order.Notes)
                    ? request.Notes.Trim()
                    : $"{order.Notes} | Gọi thêm: {request.Notes.Trim()}";
            }
            if (!string.IsNullOrWhiteSpace(request.CustomerName) && (string.IsNullOrWhiteSpace(order.CustomerNameSnapshot) || order.CustomerNameSnapshot.StartsWith("Khách Bàn")))
            {
                order.CustomerNameSnapshot = request.CustomerName.Trim();
            }
            if (!string.IsNullOrWhiteSpace(request.CustomerPhone) && string.IsNullOrWhiteSpace(order.CustomerPhoneSnapshot))
            {
                order.CustomerPhoneSnapshot = request.CustomerPhone.Trim();
            }
            order.UpdatedAt = DateTimeOffset.UtcNow;
            order.Version++;
        }
        else
        {
            // Generate new Order
            string orderNumber;
            do
            {
                orderNumber = $"QR-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..27].ToUpperInvariant();
            } while (await dbContext.Orders.AnyAsync(x => x.OrderNumber == orderNumber, ct));

            order = new Order
            {
                OrderNumber = orderNumber,
                BranchId = branch.Id,
                DiningTableId = table.Id,
                OrderType = OrderType.DineIn,
                Status = OrderStatus.Confirmed,
                CustomerNameSnapshot = string.IsNullOrWhiteSpace(request.CustomerName) ? $"Khách Bàn {table.TableNumber}" : request.CustomerName.Trim(),
                CustomerPhoneSnapshot = string.IsNullOrWhiteSpace(request.CustomerPhone) ? null : request.CustomerPhone.Trim(),
                Notes = request.Notes?.Trim(),
                CurrencyCode = "VND",
            };

            dbContext.Orders.Add(order);
            isNewOrder = true;

            // Table allocation
            dbContext.OrderTableAllocations.Add(new OrderTableAllocation
            {
                OrderId = order.Id,
                TableId = table.Id,
                AllocationType = TableAllocationType.Primary,
                AllocatedAt = DateTimeOffset.UtcNow
            });
        }

        // Add items to this order
        decimal additionalSubtotal = 0;
        foreach (var itemReq in request.Items)
        {
            var product = await dbContext.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == itemReq.ProductId && p.IsActive, ct);
            if (product is null) continue;

            var variant = itemReq.ProductVariantId.HasValue
                ? await dbContext.ProductVariants.AsNoTracking().FirstOrDefaultAsync(v => v.Id == itemReq.ProductVariantId.Value, ct)
                : null;

            var modifierIds = itemReq.ModifierIds ?? [];
            var pricing = await pricingService.CalculateAsync(new ProductPricingRequest(product.Id, itemReq.ProductVariantId, branch.Id, modifierIds), ct);

            var lineTotal = pricing.FinalUnitPrice * itemReq.Quantity;
            additionalSubtotal += lineTotal;

            var orderItem = new OrderItem
            {
                OrderId = order.Id,
                ProductId = product.Id,
                ProductVariantId = itemReq.ProductVariantId,
                ProductNameSnapshot = product.Name,
                VariantNameSnapshot = variant?.Name,
                Quantity = itemReq.Quantity,
                UnitPrice = pricing.FinalUnitPrice,
                LineTotal = lineTotal,
                Notes = itemReq.Notes?.Trim()
            };

            dbContext.OrderItems.Add(orderItem);

            // Modifiers
            if (modifierIds.Count > 0)
            {
                var modifiers = await dbContext.Modifiers.AsNoTracking().Where(m => modifierIds.Contains(m.Id)).ToListAsync(ct);
                foreach (var mod in modifiers)
                {
                    dbContext.OrderItemModifiers.Add(new OrderItemModifier
                    {
                        OrderItemId = orderItem.Id,
                        ModifierId = mod.Id,
                        ModifierNameSnapshot = mod.Name,
                        Quantity = 1,
                        UnitPrice = mod.DefaultPrice,
                        TotalPrice = mod.DefaultPrice
                    });
                }
            }
        }

        if (isNewOrder)
        {
            order.Subtotal = additionalSubtotal;
            order.TotalAmount = additionalSubtotal;
            order.TaxAmount = 0;
            order.DiscountAmount = 0;
        }
        else
        {
            order.Subtotal += additionalSubtotal;
            order.TotalAmount = order.Subtotal + order.TaxAmount - order.DiscountAmount;
        }

        await dbContext.SaveChangesAsync(ct);

        // Send newly added items to kitchen (generates tickets and sends NewOrderCreated & KitchenOrderCreated via SignalR)
        await kitchenService.CreateForConfirmedOrderAsync(order.Id, ct);

        return Ok(new PublicOrderResponse(
            order.Id,
            order.OrderNumber,
            order.TotalAmount,
            order.Status,
            table.TableNumber,
            order.CreatedAt
        ));
    }
}
