using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Features.Audit;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class AuditLogService(RestaurantDbContext dbContext) : IAuditLogService
{
    private static (string Title, string Category) ParseAction(string action)
    {
        return action switch
        {
            "OrderStatusChanged" => ("Đổi trạng thái đơn hàng", "orders"),
            "OrderItemAdded" => ("Thêm món vào đơn", "orders"),
            "OrderItemUpdated" => ("Cập nhật số lượng món", "orders"),
            "OrderItemRemoved" => ("Xóa món khỏi đơn", "orders"),
            "OrderCreated" => ("Tạo đơn hàng mới", "orders"),
            "OrderCancelled" => ("Hủy đơn hàng", "orders"),
            "OrderCompleted" => ("Hoàn tất trả bàn", "orders"),

            "PaymentCreated" => ("Tạo phiếu thu tiền", "payments"),
            "PaymentCompleted" => ("Hoàn tất thanh toán", "payments"),
            "PaymentCancelled" => ("Hủy phiếu thanh toán", "payments"),
            "PaymentRefunded" => ("Hoàn tiền thanh toán", "payments"),
            "PaymentPartiallyRefunded" => ("Hoàn tiền một phần", "payments"),
            "PaymentReclassified" => ("Phân loại lại phương thức thu", "payments"),

            "KitchenOrderCreated" => ("Gửi đơn sang trạm bếp", "kitchen"),
            "KitchenOrderAccepted" => ("Bếp nhận đơn", "kitchen"),
            "KitchenOrderPreparing" => ("Bếp đang chế biến", "kitchen"),
            "KitchenOrderReady" => ("Món đã chế biến xong", "kitchen"),
            "KitchenOrderCompleted" => ("Đã phục vụ ra bàn", "kitchen"),
            "KitchenOrderCancelled" => ("Hủy phiếu bếp", "kitchen"),
            "KitchenStationCreated" => ("Tạo trạm bếp mới", "kitchen"),

            "EmployeeCreated" => ("Thêm nhân viên mới", "employees"),
            "EmployeeUpdated" => ("Cập nhật thông tin nhân viên", "employees"),
            "EmployeeDeactivated" => ("Khóa tài khoản nhân viên", "employees"),

            "ProductCreated" => ("Tạo món ăn mới", "menu"),
            "ProductUpdated" => ("Cập nhật món ăn", "menu"),
            "ProductDeleted" => ("Xóa món ăn", "menu"),
            "ProductActivated" => ("Bật mở bán món", "menu"),
            "ProductDeactivated" => ("Ngừng mở bán món", "menu"),
            "ProductVariantCreated" => ("Thêm biến thể món", "menu"),
            "ProductVariantUpdated" => ("Sửa biến thể món", "menu"),
            "CategoryCreated" => ("Tạo danh mục món", "menu"),
            "CategoryUpdated" => ("Cập nhật danh mục", "menu"),
            "CategoryActivated" => ("Kích hoạt danh mục", "menu"),
            "CategoryDeactivated" => ("Ẩn danh mục", "menu"),
            "BranchProductCreated" => ("Áp dụng món vào chi nhánh", "menu"),
            "BranchProductUpdated" => ("Cập nhật giá bán tại chi nhánh", "menu"),
            "BranchProductAvailabilityChanged" => ("Chuyển trạng thái còn/hết hàng", "menu"),
            "ModifierGroupCreated" => ("Tạo nhóm tùy chọn", "menu"),
            "ModifierCreated" => ("Tạo tùy chọn món", "menu"),
            "ComboCreated" => ("Tạo combo món", "menu"),
            "ComboUpdated" => ("Cập nhật combo món", "menu"),

            "InventoryItemCreated" => ("Tạo nguyên vật liệu", "inventory"),
            "InventoryStockPurchase" => ("Nhập kho nguyên liệu", "inventory"),
            "InventoryStockAdjustment" => ("Điều chỉnh / Kiểm kê kho", "inventory"),
            "InventoryStockWaste" => ("Xuất hủy hao hụt kho", "inventory"),
            "InventoryStockUsage" => ("Xuất kho chế biến", "inventory"),
            "InventoryStockTransfer" => ("Điều chuyển nguyên liệu kho", "inventory"),

            _ => InferDefault(action)
        };
    }

    private static (string Title, string Category) InferDefault(string action)
    {
        var category = "other";
        if (action.Contains("Payment", StringComparison.OrdinalIgnoreCase)) category = "payments";
        else if (action.Contains("Order", StringComparison.OrdinalIgnoreCase)) category = "orders";
        else if (action.Contains("Kitchen", StringComparison.OrdinalIgnoreCase)) category = "kitchen";
        else if (action.Contains("Product", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Category", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Menu", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Combo", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Modifier", StringComparison.OrdinalIgnoreCase)) category = "menu";
        else if (action.Contains("Employee", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("User", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Role", StringComparison.OrdinalIgnoreCase)) category = "employees";
        else if (action.Contains("Inventory", StringComparison.OrdinalIgnoreCase) ||
                 action.Contains("Stock", StringComparison.OrdinalIgnoreCase)) category = "inventory";

        return (action, category);
    }

    public async Task<AuditLogPagedResponse> GetLogsAsync(AuditLogFilterRequest filter, CancellationToken ct)
    {
        var query = dbContext.AuditLogs.AsNoTracking();

        if (filter.UserId.HasValue)
        {
            query = query.Where(x => x.UserId == filter.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            query = query.Where(x => x.Action == filter.Action.Trim());
        }

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
        {
            query = query.Where(x => x.EntityType == filter.EntityType.Trim());
        }

        if (filter.FromDate.HasValue)
        {
            var fromUtc = filter.FromDate.Value.ToUniversalTime();
            query = query.Where(x => x.CreatedAt >= fromUtc);
        }

        if (filter.ToDate.HasValue)
        {
            var toUtc = filter.ToDate.Value.ToUniversalTime();
            query = query.Where(x => x.CreatedAt <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(x =>
                (x.ActorNameSnapshot != null && x.ActorNameSnapshot.ToLower().Contains(s)) ||
                x.Action.ToLower().Contains(s) ||
                x.EntityType.ToLower().Contains(s) ||
                (x.IpAddress != null && x.IpAddress.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 10, 100);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var rawLogs = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Fetch user information mapping for display
        var userIds = rawLogs.Where(x => x.UserId.HasValue).Select(x => x.UserId!.Value).Distinct().ToList();
        var users = await dbContext.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.EmployeeId })
            .ToListAsync(ct);

        var employeeIds = users.Where(u => u.EmployeeId.HasValue).Select(u => u.EmployeeId!.Value).Distinct().ToList();
        var employees = await dbContext.Employees.AsNoTracking()
            .Where(e => employeeIds.Contains(e.Id))
            .Select(e => new { e.Id, e.FullName })
            .ToDictionaryAsync(e => e.Id, e => e.FullName, ct);

        var userDict = users.ToDictionary(
            u => u.Id,
            u => (
                Username: u.Username,
                FullName: u.EmployeeId.HasValue && employees.TryGetValue(u.EmployeeId.Value, out var fn) ? fn : u.Username
            )
        );

        var items = new List<AuditLogListItem>(rawLogs.Count);
        foreach (var log in rawLogs)
        {
            var (title, category) = ParseAction(log.Action);

            // Filter by ActionCategory in-memory if requested
            if (!string.IsNullOrWhiteSpace(filter.ActionCategory) &&
                !string.Equals(category, filter.ActionCategory, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            string username = log.ActorNameSnapshot ?? "Hệ thống";
            string fullName = log.ActorNameSnapshot ?? "Hệ thống";

            if (log.UserId.HasValue && userDict.TryGetValue(log.UserId.Value, out var uInfo))
            {
                username = uInfo.Username;
                fullName = uInfo.FullName;
            }

            items.Add(new AuditLogListItem(
                log.Id,
                log.CreatedAt,
                log.UserId,
                username,
                fullName,
                log.Action,
                title,
                category,
                log.EntityType,
                log.EntityId,
                log.IpAddress,
                log.MetadataJson));
        }

        return new AuditLogPagedResponse(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<AuditLogStatsResponse> GetStatsAsync(CancellationToken ct)
    {
        var totalLogs = await dbContext.AuditLogs.CountAsync(ct);

        var todayUtcStart = DateTimeOffset.UtcNow.Date;
        var todayLogs = await dbContext.AuditLogs
            .Where(x => x.CreatedAt >= todayUtcStart)
            .CountAsync(ct);

        var activeUsersCount = await dbContext.AuditLogs
            .Where(x => x.UserId != null)
            .Select(x => x.UserId)
            .Distinct()
            .CountAsync(ct);

        var latest = await dbContext.AuditLogs
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => (DateTimeOffset?)x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return new AuditLogStatsResponse(totalLogs, todayLogs, activeUsersCount, latest);
    }

    public async Task<IReadOnlyList<string>> GetActionTypesAsync(CancellationToken ct)
    {
        return await dbContext.AuditLogs.AsNoTracking()
            .Select(x => x.Action)
            .Distinct()
            .OrderBy(x => x)
            .Take(100)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<AuditActorItem>> GetActorsAsync(CancellationToken ct)
    {
        var activeUserIds = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.UserId != null)
            .Select(x => x.UserId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var users = await dbContext.Users.AsNoTracking()
            .Where(u => activeUserIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.EmployeeId })
            .ToListAsync(ct);

        var employeeIds = users.Where(u => u.EmployeeId.HasValue).Select(u => u.EmployeeId!.Value).Distinct().ToList();
        var employees = await dbContext.Employees.AsNoTracking()
            .Where(e => employeeIds.Contains(e.Id))
            .Select(e => new { e.Id, e.FullName })
            .ToDictionaryAsync(e => e.Id, e => e.FullName, ct);

        var result = new List<AuditActorItem>();
        foreach (var u in users)
        {
            var fullName = u.EmployeeId.HasValue && employees.TryGetValue(u.EmployeeId.Value, out var fn) ? fn : u.Username;
            result.Add(new AuditActorItem(u.Id, u.Username, fullName));
        }

        return result.OrderBy(x => x.FullName).ToList();
    }
}
