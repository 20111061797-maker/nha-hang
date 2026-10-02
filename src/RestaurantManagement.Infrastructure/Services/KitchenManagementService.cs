using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class KitchenManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter,
    IKitchenEventPublisher eventPublisher) : IKitchenService
{
    public async Task<IReadOnlyList<KitchenStationResponse>> GetStationsAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        return await dbContext.KitchenStations.AsNoTracking().Where(x => x.BranchId == branchId).OrderBy(x => x.DisplayOrder).Select(ToStationResponse()).ToListAsync(cancellationToken);
    }

    public async Task<KitchenStationResponse?> GetStationAsync(Guid stationId, CancellationToken cancellationToken)
    {
        var station = await dbContext.KitchenStations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == stationId, cancellationToken);
        if (station is null) return null;
        await EnsureBranchAccessAsync(station.BranchId, cancellationToken);
        return ToStationResponse(station);
    }

    public async Task<KitchenStationResponse> CreateStationAsync(Guid branchId, CreateKitchenStationRequest request, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        if (!await dbContext.Branches.AnyAsync(x => x.Id == branchId && x.IsActive, cancellationToken)) throw new ApplicationException("Branch does not exist or is inactive.");
        var station = new KitchenStation { BranchId = branchId, Code = request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description, DisplayOrder = request.DisplayOrder };
        dbContext.KitchenStations.Add(station);
        await auditWriter.WriteAsync("KitchenStationCreated", nameof(KitchenStation), station.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToStationResponse(station);
    }

    public async Task<KitchenStationResponse?> UpdateStationAsync(Guid stationId, UpdateKitchenStationRequest request, CancellationToken cancellationToken)
    {
        var station = await dbContext.KitchenStations.FirstOrDefaultAsync(x => x.Id == stationId, cancellationToken);
        if (station is null) return null;
        await EnsureBranchAccessAsync(station.BranchId, cancellationToken);
        station.Code = request.Code.Trim(); station.Name = request.Name.Trim(); station.Description = request.Description; station.DisplayOrder = request.DisplayOrder; station.IsActive = request.IsActive;
        await auditWriter.WriteAsync(request.IsActive ? "KitchenStationUpdated" : "KitchenStationDeactivated", nameof(KitchenStation), station.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return ToStationResponse(station);
    }

    public async Task<IReadOnlyList<KitchenStationProductResponse>> GetStationProductsAsync(Guid stationId, CancellationToken cancellationToken)
    {
        var station = await dbContext.KitchenStations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == stationId, cancellationToken) ?? throw new ApplicationException("Kitchen station does not exist.");
        await EnsureBranchAccessAsync(station.BranchId, cancellationToken);
        return await dbContext.KitchenStationProducts.AsNoTracking().Where(x => x.KitchenStationId == stationId && x.IsActive).OrderBy(x => x.DisplayOrder).Select(x => new KitchenStationProductResponse(x.ProductId, x.DisplayOrder, x.IsActive)).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<KitchenStationProductResponse>> SetStationProductsAsync(Guid stationId, KitchenStationProductRequest request, CancellationToken cancellationToken)
    {
        var station = await dbContext.KitchenStations.FirstOrDefaultAsync(x => x.Id == stationId, cancellationToken) ?? throw new ApplicationException("Kitchen station does not exist.");
        await EnsureBranchAccessAsync(station.BranchId, cancellationToken);
        var productIds = request.ProductIds.Distinct().ToArray();
        var validProducts = await dbContext.Products.Where(x => productIds.Contains(x.Id) && x.IsActive).Select(x => x.Id).ToListAsync(cancellationToken);
        if (validProducts.Count != productIds.Length) throw new ApplicationException("One or more products do not exist or are inactive.");
        var mappings = await dbContext.KitchenStationProducts.Where(x => x.KitchenStationId == stationId).ToListAsync(cancellationToken);
        foreach (var mapping in mappings) mapping.IsActive = false;
        for (var index = 0; index < productIds.Length; index++)
        {
            var mapping = mappings.FirstOrDefault(x => x.ProductId == productIds[index]);
            if (mapping is null) dbContext.KitchenStationProducts.Add(new KitchenStationProduct { KitchenStationId = stationId, ProductId = productIds[index], DisplayOrder = index });
            else { mapping.IsActive = true; mapping.DisplayOrder = index; }
        }
        await auditWriter.WriteAsync("KitchenStationProductsUpdated", nameof(KitchenStation), stationId, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        return await GetStationProductsAsync(stationId, cancellationToken);
    }

    public async Task<IReadOnlyList<KitchenOrderResponse>> GetBranchOrdersAsync(Guid branchId, Guid? stationId, KitchenOrderStatus? status, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        var query = dbContext.KitchenOrders.AsNoTracking().Where(x => x.BranchId == branchId);
        if (stationId.HasValue) query = query.Where(x => x.KitchenStationId == stationId.Value);
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var orders = await query.Where(x => x.Status != KitchenOrderStatus.Completed && x.Status != KitchenOrderStatus.Cancelled).OrderBy(x => x.Priority).ThenBy(x => x.CreatedAt).Take(200).ToListAsync(cancellationToken);
        return await BuildResponsesAsync(orders, cancellationToken);
    }

    public async Task<KitchenOrderResponse?> GetOrderAsync(Guid kitchenOrderId, CancellationToken cancellationToken)
    {
        var order = await dbContext.KitchenOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == kitchenOrderId, cancellationToken);
        if (order is null) return null;
        await EnsureBranchAccessAsync(order.BranchId, cancellationToken);
        return (await BuildResponsesAsync([order], cancellationToken)).Single();
    }

    public async Task<IReadOnlyList<KitchenOrderResponse>> CreateForConfirmedOrderAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken) ?? throw new ApplicationException("Order does not exist.");
        await EnsureBranchAccessAsync(order.BranchId, cancellationToken);
        if (order.Status != OrderStatus.Confirmed) throw new ApplicationException("Kitchen work can only be created for confirmed orders.");
        var items = await dbContext.OrderItems.AsNoTracking().Where(x => x.OrderId == orderId).ToListAsync(cancellationToken);
        var productIds = items.Select(x => x.ProductId).Distinct().ToArray();
        var routes = await (from mapping in dbContext.KitchenStationProducts
                            join station in dbContext.KitchenStations on mapping.KitchenStationId equals station.Id
                    where productIds.Contains(mapping.ProductId) && mapping.IsActive && station.BranchId == order.BranchId && station.IsActive
                            select new { mapping.ProductId, StationId = station.Id }).ToListAsync(cancellationToken);
        var stationIds = routes.Select(x => x.StationId).Distinct().ToArray();
        var existing = await dbContext.KitchenOrders.Where(x => x.OrderId == orderId && stationIds.Contains(x.KitchenStationId)).ToListAsync(cancellationToken);
        var created = new List<KitchenOrder>();
        foreach (var stationId in stationIds)
        {
            var kitchenOrder = existing.FirstOrDefault(x => x.KitchenStationId == stationId);
            if (kitchenOrder is null)
            {
                kitchenOrder = new KitchenOrder { OrderId = order.Id, BranchId = order.BranchId, KitchenStationId = stationId, OrderNumberSnapshot = order.OrderNumber, OrderTypeSnapshot = order.OrderType, Status = KitchenOrderStatus.New, Note = order.Notes };
                dbContext.KitchenOrders.Add(kitchenOrder); created.Add(kitchenOrder);
            }
            var routedProductIds = routes.Where(x => x.StationId == stationId).Select(x => x.ProductId).ToHashSet();
            var existingItemIds = await dbContext.KitchenOrderItems.Where(x => x.KitchenOrderId == kitchenOrder.Id).Select(x => x.OrderItemId).ToListAsync(cancellationToken);
            foreach (var item in items.Where(x => routedProductIds.Contains(x.ProductId) && !existingItemIds.Contains(x.Id)))
            {
                var modifiers = await dbContext.OrderItemModifiers.AsNoTracking().Where(x => x.OrderItemId == item.Id).Select(x => x.ModifierNameSnapshot).ToListAsync(cancellationToken);
                dbContext.KitchenOrderItems.Add(new KitchenOrderItem { KitchenOrderId = kitchenOrder.Id, OrderItemId = item.Id, ProductId = item.ProductId, ProductVariantId = item.ProductVariantId, ProductNameSnapshot = item.ComboNameSnapshot ?? item.ProductNameSnapshot, VariantNameSnapshot = item.VariantNameSnapshot, Quantity = item.Quantity, NotesSnapshot = item.Notes, ModifierNamesSnapshot = JsonSerializer.Serialize(modifiers) });
            }
        }
        if (created.Count == 0) return await BuildResponsesAsync(existing, cancellationToken);
        foreach (var ticket in created) await auditWriter.WriteAsync("KitchenOrderCreated", nameof(KitchenOrder), ticket.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        foreach (var ticket in created) await eventPublisher.PublishAsync(new KitchenEvent("KitchenOrderCreated", ticket.Id, ticket.OrderId, ticket.BranchId, ticket.KitchenStationId, ticket.Status, ticket.UpdatedAt), cancellationToken);
        return await BuildResponsesAsync(created.Concat(existing).ToList(), cancellationToken);
    }

    public async Task<KitchenOrderResponse?> ChangeStatusAsync(Guid kitchenOrderId, KitchenOrderStatus target, KitchenOrderStatusRequest request, CancellationToken cancellationToken)
    {
        var kitchenOrder = await dbContext.KitchenOrders.FirstOrDefaultAsync(x => x.Id == kitchenOrderId, cancellationToken);
        if (kitchenOrder is null) return null;
        await EnsureBranchAccessAsync(kitchenOrder.BranchId, cancellationToken);
        if (request.ExpectedVersion.HasValue && request.ExpectedVersion.Value != kitchenOrder.Version) throw new ConflictException("The kitchen order was changed by another user.");
        if (!IsAllowedTransition(kitchenOrder.Status, target)) throw new ApplicationException($"Cannot change kitchen status from {kitchenOrder.Status} to {target}.");
        var now = DateTimeOffset.UtcNow;
        kitchenOrder.Status = target; kitchenOrder.Version++;
        if (target == KitchenOrderStatus.Accepted) kitchenOrder.AcceptedAt = now;
        if (target == KitchenOrderStatus.Preparing) kitchenOrder.StartedAt = now;
        if (target == KitchenOrderStatus.Ready) kitchenOrder.ReadyAt = now;
        if (target == KitchenOrderStatus.Completed) kitchenOrder.CompletedAt = now;
        if (target == KitchenOrderStatus.Cancelled) kitchenOrder.CancelledAt = now;
        await auditWriter.WriteAsync($"KitchenOrder{target}", nameof(KitchenOrder), kitchenOrder.Id, currentUser.Username, null, cancellationToken);
        await SaveAsync(cancellationToken);
        await eventPublisher.PublishAsync(new KitchenEvent($"KitchenOrder{target}", kitchenOrder.Id, kitchenOrder.OrderId, kitchenOrder.BranchId, kitchenOrder.KitchenStationId, target, kitchenOrder.UpdatedAt), cancellationToken);
        return (await BuildResponsesAsync([kitchenOrder], cancellationToken)).Single();
    }

    private async Task<List<KitchenOrderResponse>> BuildResponsesAsync(IReadOnlyList<KitchenOrder> orders, CancellationToken ct)
    {
        if (orders.Count == 0) return [];
        var stationIds = orders.Select(x => x.KitchenStationId).ToArray(); var ticketIds = orders.Select(x => x.Id).ToArray();
        var stations = await dbContext.KitchenStations.AsNoTracking().Where(x => stationIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var items = await dbContext.KitchenOrderItems.AsNoTracking().Where(x => ticketIds.Contains(x.KitchenOrderId)).ToListAsync(ct);
        return orders.Select(order => new KitchenOrderResponse(order.Id, order.OrderId, order.BranchId, order.KitchenStationId, stations[order.KitchenStationId].Name, order.OrderNumberSnapshot, order.OrderTypeSnapshot, order.TableNumberSnapshot, order.Status, order.Priority, order.CreatedAt, order.UpdatedAt, order.Version, items.Where(x => x.KitchenOrderId == order.Id).Select(x => new KitchenOrderItemResponse(x.Id, x.OrderItemId, x.ProductId, x.ProductNameSnapshot, x.VariantNameSnapshot, x.Quantity, x.Status, x.NotesSnapshot, JsonSerializer.Deserialize<List<string>>(x.ModifierNamesSnapshot ?? "[]") ?? [])).ToList())).ToList();
    }

    private async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken ct) { if (currentUser.IsAdministrator) return; if (currentUser.UserId is not Guid userId || !await dbContext.UserBranchAccesses.AnyAsync(x => x.UserId == userId && x.BranchId == branchId && x.IsActive, ct)) throw new ForbiddenException("You do not have access to this branch."); }
    private async Task SaveAsync(CancellationToken ct) { try { await dbContext.SaveChangesAsync(ct); } catch (DbUpdateConcurrencyException) { throw new ConflictException("The kitchen order was changed by another user."); } catch (DbUpdateException) { throw new ConflictException("The kitchen operation conflicts with existing data."); } }
    private static bool IsAllowedTransition(KitchenOrderStatus from, KitchenOrderStatus to) => (from, to) switch { (KitchenOrderStatus.New, KitchenOrderStatus.Accepted or KitchenOrderStatus.Cancelled) => true, (KitchenOrderStatus.Accepted, KitchenOrderStatus.Preparing or KitchenOrderStatus.Cancelled) => true, (KitchenOrderStatus.Preparing, KitchenOrderStatus.Ready or KitchenOrderStatus.Cancelled) => true, (KitchenOrderStatus.Ready, KitchenOrderStatus.Completed) => true, _ => false };
    private static KitchenStationResponse ToStationResponse(KitchenStation x) => new(x.Id, x.BranchId, x.Code, x.Name, x.Description, x.DisplayOrder, x.IsActive);
    private static System.Linq.Expressions.Expression<Func<KitchenStation, KitchenStationResponse>> ToStationResponse() => x => new KitchenStationResponse(x.Id, x.BranchId, x.Code, x.Name, x.Description, x.DisplayOrder, x.IsActive);
}