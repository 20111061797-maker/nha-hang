using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Authentication;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.API.Controllers;

/// <summary>Aggregated real-time dashboard figures computed from live order, table and kitchen data.</summary>
[ApiController]
[Authorize]
[Route("api/branches/{branchId:guid}/dashboard")]
public sealed class DashboardController(RestaurantDbContext dbContext) : ControllerBase
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    [HttpGet, RequirePermission("order.read")]
    public async Task<IActionResult> Get(Guid branchId, [FromQuery] string? range, CancellationToken ct)
    {
        var nowLocal = DateTimeOffset.UtcNow.ToOffset(VietnamOffset);
        var todayStart = new DateTimeOffset(nowLocal.Year, nowLocal.Month, nowLocal.Day, 0, 0, 0, VietnamOffset);
        var yesterdayStart = todayStart.AddDays(-1);
        var monthStart = new DateTimeOffset(nowLocal.Year, nowLocal.Month, 1, 0, 0, 0, VietnamOffset);
        var lastMonthStart = monthStart.AddMonths(-1);
        var weekStart = todayStart.AddDays(-(((int)nowLocal.DayOfWeek + 6) % 7));

        var (rangeStart, rangeEnd) = (range?.ToLowerInvariant()) switch
        {
            "yesterday" => (yesterdayStart, todayStart),
            "week" => (weekStart, todayStart.AddDays(1)),
            "month" => (monthStart, monthStart.AddMonths(1)),
            _ => (todayStart, todayStart.AddDays(1)),
        };

        // Only fetch the window we need: from the earliest boundary used below.
        // Npgsql only accepts DateTimeOffset values with offset 0 (UTC) as query parameters.
        var earliest = (lastMonthStart < weekStart ? lastMonthStart : weekStart).ToUniversalTime();
        var orders = await dbContext.Orders.AsNoTracking()
            .Where(o => o.BranchId == branchId && o.CreatedAt >= earliest && o.Status != OrderStatus.Cancelled)
            .Select(o => new { o.Id, o.OrderNumber, o.Status, o.TotalAmount, o.CreatedAt, o.DiningTableId })
            .ToListAsync(ct);

        decimal Revenue(DateTimeOffset from, DateTimeOffset to) => orders
            .Where(o => o.Status == OrderStatus.Completed && o.CreatedAt >= from && o.CreatedAt < to)
            .Sum(o => o.TotalAmount);

        var revenueToday = Revenue(todayStart, todayStart.AddDays(1));
        var revenueYesterday = Revenue(yesterdayStart, todayStart);
        var revenueMonth = Revenue(monthStart, monthStart.AddMonths(1));
        var revenueLastMonth = Revenue(lastMonthStart, monthStart);
        var revenueRange = Revenue(rangeStart, rangeEnd);

        var rangeOrders = orders.Where(o => o.CreatedAt >= rangeStart && o.CreatedAt < rangeEnd).ToList();
        var rangeOrderIds = rangeOrders.Select(o => o.Id).ToList();

        // Hourly revenue (completed orders) for today
        var hourly = Enumerable.Range(0, 24)
            .Select(h => new
            {
                hour = h,
                revenue = orders
                    .Where(o => o.Status == OrderStatus.Completed && o.CreatedAt >= todayStart && o.CreatedAt < todayStart.AddDays(1)
                                && o.CreatedAt.ToOffset(VietnamOffset).Hour == h)
                    .Sum(o => o.TotalAmount)
            })
            .ToList();

        // Top products in the selected range
        var rangeItems = await dbContext.OrderItems.AsNoTracking()
            .Where(i => rangeOrderIds.Contains(i.OrderId))
            .Select(i => new { i.OrderId, i.ProductNameSnapshot, i.Quantity, i.LineTotal })
            .ToListAsync(ct);

        var topProducts = rangeItems
            .GroupBy(i => i.ProductNameSnapshot)
            .Select(g => new { name = g.Key, quantity = g.Sum(x => x.Quantity), revenue = g.Sum(x => x.LineTotal) })
            .OrderByDescending(x => x.quantity)
            .Take(5)
            .ToList();
        var topByRevenue = rangeItems
            .GroupBy(i => i.ProductNameSnapshot)
            .Select(g => new { name = g.Key, quantity = g.Sum(x => x.Quantity), revenue = g.Sum(x => x.LineTotal) })
            .OrderByDescending(x => x.revenue)
            .Take(4)
            .ToList();

        // Tables
        var tables = await dbContext.DiningTables.AsNoTracking()
            .Where(t => t.BranchId == branchId && t.IsActive)
            .Select(t => new { t.Id, t.TableNumber, t.Status })
            .ToListAsync(ct);
        var tableNames = tables.ToDictionary(t => t.Id, t => t.TableNumber);

        // Kitchen
        var kitchen = await dbContext.KitchenOrders.AsNoTracking()
            .Where(k => k.BranchId == branchId
                        && (k.Status == KitchenOrderStatus.New || k.Status == KitchenOrderStatus.Accepted || k.Status == KitchenOrderStatus.Preparing))
            .OrderBy(k => k.CreatedAt)
            .Select(k => new { k.Id, k.OrderNumberSnapshot, k.TableNumberSnapshot, k.Status, k.CreatedAt })
            .ToListAsync(ct);
        var kitchenOrderCount = kitchen.Count;
        var waitingKitchenCount = kitchen.Count(k => k.Status == KitchenOrderStatus.New);

        // Recent orders (latest 6, any status except cancelled) with item summary
        var recent = orders.OrderByDescending(o => o.CreatedAt).Take(6).ToList();
        var recentIds = recent.Select(o => o.Id).ToList();
        var recentItems = await dbContext.OrderItems.AsNoTracking()
            .Where(i => recentIds.Contains(i.OrderId))
            .Select(i => new { i.OrderId, i.ProductNameSnapshot, i.Quantity })
            .ToListAsync(ct);

        var recentOrders = recent.Select(o => new
        {
            id = o.Id,
            orderNumber = o.OrderNumber,
            createdAt = o.CreatedAt,
            tableNumber = o.DiningTableId.HasValue && tableNames.TryGetValue(o.DiningTableId.Value, out var tn) ? tn : null,
            status = o.Status,
            totalAmount = o.TotalAmount,
            summary = string.Join(", ", recentItems.Where(i => i.OrderId == o.Id).Select(i => $"{i.Quantity:0.##} {i.ProductNameSnapshot}"))
        }).ToList();

        var nowUtc = DateTimeOffset.UtcNow;
        return Ok(new
        {
            revenueToday,
            revenueYesterday,
            revenueMonth,
            revenueLastMonth,
            revenueRange,
            orderCountToday = orders.Count(o => o.CreatedAt >= todayStart && o.CreatedAt < todayStart.AddDays(1)),
            orderCountRange = rangeOrders.Count,
            waitingKitchenCount,
            tablesTotal = tables.Count,
            tablesOccupied = tables.Count(t => t.Status != TableStatus.Available && t.Status != TableStatus.OutOfService),
            hourly,
            topProducts,
            topByRevenue,
            recentOrders,
            kitchenOrderCount,
            kitchenOrders = kitchen.Take(5).Select(k => new
            {
                id = k.Id,
                orderNumber = k.OrderNumberSnapshot,
                tableNumber = k.TableNumberSnapshot,
                status = k.Status,
                createdAt = k.CreatedAt,
                waitingMinutes = (int)Math.Max(0, (nowUtc - k.CreatedAt).TotalMinutes)
            })
        });
    }
}
