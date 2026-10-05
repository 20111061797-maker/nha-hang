using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using ApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;
namespace RestaurantManagement.Infrastructure.Services;

public sealed class BranchManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IBranchManagementService
{
    public async Task<IReadOnlyList<BranchListItem>> GetBranchesAsync(CancellationToken cancellationToken)
    {
        var query = dbContext.Branches.AsNoTracking().Where(x => x.IsActive);
        if (!currentUser.IsAdministrator)
        {
            var branchIds = await GetAccessibleBranchIdsAsync(cancellationToken);
            query = query.Where(x => branchIds.Contains(x.Id));
        }

        return await query.OrderBy(x => x.Name).Select(x => new BranchListItem(x.Id, x.Code, x.Name, x.Description, x.Phone, x.Email, x.Address, x.IsActive)).ToListAsync(cancellationToken);
    }

    public async Task<BranchDetails?> GetBranchAsync(Guid id, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(id, cancellationToken);
        return await dbContext.Branches.AsNoTracking().Where(x => x.Id == id).Select(ToBranchDetails()).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<BranchDetails> CreateBranchAsync(CreateBranchRequest request, CancellationToken cancellationToken)
    {
        ValidateText(request.Code, "Branch code", 50);
        ValidateText(request.Name, "Branch name", 200);
        if (await dbContext.Branches.AnyAsync(x => x.Code == request.Code.Trim(), cancellationToken))
        {
            throw new ConflictException("A branch with this code already exists.");
        }

        var branch = new Branch { Code = request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description, Phone = request.Phone, Email = request.Email, Address = request.Address };
        dbContext.Branches.Add(branch);
        await auditWriter.WriteAsync("BranchCreated", nameof(Branch), branch.Id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToBranchDetails(branch);
    }

    public async Task<BranchDetails?> UpdateBranchAsync(Guid id, UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(id, cancellationToken);
        ValidateText(request.Code, "Branch code", 50);
        ValidateText(request.Name, "Branch name", 200);
        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (branch is null) return null;
        if (await dbContext.Branches.AnyAsync(x => x.Id != id && x.Code == request.Code.Trim(), cancellationToken)) throw new ConflictException("A branch with this code already exists.");
        branch.Code = request.Code.Trim(); branch.Name = request.Name.Trim(); branch.Description = request.Description; branch.Phone = request.Phone; branch.Email = request.Email; branch.Address = request.Address;
        await auditWriter.WriteAsync("BranchUpdated", nameof(Branch), id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToBranchDetails(branch);
    }

    public async Task<bool> SetBranchStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(id, cancellationToken);
        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (branch is null) return false;
        branch.IsActive = isActive;
        await auditWriter.WriteAsync(isActive ? "BranchActivated" : "BranchDeactivated", nameof(Branch), id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<AreaListItem>> GetAreasAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        return await dbContext.Areas.AsNoTracking().Where(x => x.BranchId == branchId && x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).Select(x => new AreaListItem(x.Id, x.BranchId, x.Name, x.Description, x.DisplayOrder, x.IsActive)).ToListAsync(cancellationToken);
    }

    public async Task<AreaDetails?> GetAreaAsync(Guid id, CancellationToken cancellationToken)
    {
        var area = await dbContext.Areas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (area is null) return null;
        await EnsureBranchAccessAsync(area.BranchId, cancellationToken);
        return ToAreaDetails(area);
    }

    public async Task<AreaDetails> CreateAreaAsync(Guid branchId, CreateAreaRequest request, CancellationToken cancellationToken)
    {
        await EnsureActiveBranchAccessAsync(branchId, cancellationToken);
        ValidateText(request.Name, "Area name", 200);
        if (await dbContext.Areas.AnyAsync(x => x.BranchId == branchId && x.Name == request.Name.Trim(), cancellationToken)) throw new ConflictException("An area with this name already exists in the branch.");
        var area = new Area { BranchId = branchId, Name = request.Name.Trim(), Description = request.Description, DisplayOrder = request.DisplayOrder };
        dbContext.Areas.Add(area); await auditWriter.WriteAsync("AreaCreated", nameof(Area), area.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken);
        return ToAreaDetails(area);
    }

    public async Task<AreaDetails?> UpdateAreaAsync(Guid id, UpdateAreaRequest request, CancellationToken cancellationToken)
    {
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (area is null) return null;
        await EnsureActiveBranchAccessAsync(area.BranchId, cancellationToken); ValidateText(request.Name, "Area name", 200);
        if (await dbContext.Areas.AnyAsync(x => x.Id != id && x.BranchId == area.BranchId && x.Name == request.Name.Trim(), cancellationToken)) throw new ConflictException("An area with this name already exists in the branch.");
        area.Name = request.Name.Trim(); area.Description = request.Description; area.DisplayOrder = request.DisplayOrder;
        await auditWriter.WriteAsync("AreaUpdated", nameof(Area), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToAreaDetails(area);
    }

    public async Task<bool> SetAreaStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (area is null) return false;
        await EnsureBranchAccessAsync(area.BranchId, cancellationToken); area.IsActive = isActive;
        await auditWriter.WriteAsync(isActive ? "AreaActivated" : "AreaDeactivated", nameof(Area), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<bool> DeleteAreaAsync(Guid id, bool cascade = false, Guid? moveToAreaId = null, CancellationToken cancellationToken = default)
    {
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (area is null) return false;
        await EnsureActiveBranchAccessAsync(area.BranchId, cancellationToken);

        var activeTables = await dbContext.DiningTables
            .Where(x => x.AreaId == id && x.IsActive)
            .ToListAsync(cancellationToken);

        if (activeTables.Count > 0)
        {
            if (moveToAreaId.HasValue)
            {
                if (moveToAreaId.Value == id)
                    throw new ApplicationException("Không thể chuyển bàn về chính khu vực đang xóa.");

                var targetArea = await dbContext.Areas.FirstOrDefaultAsync(
                    x => x.Id == moveToAreaId.Value && x.BranchId == area.BranchId && x.IsActive,
                    cancellationToken)
                    ?? throw new ApplicationException("Khu vực chuyển đến không tồn tại hoặc đã bị vô hiệu hóa.");

                foreach (var table in activeTables)
                {
                    table.AreaId = targetArea.Id;
                }
            }
            else if (cascade)
            {
                foreach (var table in activeTables)
                {
                    if (table.Status == TableStatus.Occupied)
                        throw new ApplicationException($"Không thể xóa khu vực: Bàn {table.TableNumber} đang có khách ngồi.");

                    var hasActiveOrders = await dbContext.Orders.AnyAsync(
                        x => x.DiningTableId == table.Id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled,
                        cancellationToken);
                    if (hasActiveOrders)
                        throw new ApplicationException($"Không thể xóa khu vực: Bàn {table.TableNumber} đang có đơn hàng chưa hoàn tất.");

                    table.IsActive = false;
                    await auditWriter.WriteAsync("TableDeleted", nameof(DiningTable), table.Id, currentUser.Username, null, cancellationToken);
                }
            }
            else
            {
                throw new ApplicationException($"Không thể xóa khu vực khi còn {activeTables.Count} bàn ăn đang hoạt động. Vui lòng chuyển hoặc xóa bàn trước.");
            }
        }

        area.IsActive = false;
        await auditWriter.WriteAsync("AreaDeleted", nameof(Area), id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TableListItem>> GetTablesAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        return await dbContext.DiningTables.AsNoTracking().Where(x => x.BranchId == branchId && x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.TableNumber).Select(x => new TableListItem(x.Id, x.BranchId, x.AreaId, x.TableNumber, x.Name, x.Capacity, x.Status, x.QrCodeIdentifier, x.DisplayOrder, x.IsActive)).ToListAsync(cancellationToken);
    }

    public async Task<TableDetails?> GetTableAsync(Guid id, CancellationToken cancellationToken)
    {
        var table = await dbContext.DiningTables.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (table is null) return null;
        await EnsureBranchAccessAsync(table.BranchId, cancellationToken); return ToTableDetails(table);
    }

    public async Task<TableDetails> CreateTableAsync(Guid branchId, CreateTableRequest request, CancellationToken cancellationToken)
    {
        await EnsureActiveBranchAccessAsync(branchId, cancellationToken); ValidateTable(request.TableNumber, request.Capacity);
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == request.AreaId && x.BranchId == branchId && x.IsActive, cancellationToken) ?? throw new ApplicationException("Area does not belong to the requested branch or is inactive.");
        if (await dbContext.DiningTables.AnyAsync(x => x.BranchId == branchId && x.TableNumber == request.TableNumber.Trim() && x.IsActive, cancellationToken)) throw new ConflictException("A table with this number already exists in the branch.");
        if (!string.IsNullOrWhiteSpace(request.QrCodeIdentifier) && await dbContext.DiningTables.AnyAsync(x => x.QrCodeIdentifier == request.QrCodeIdentifier && x.IsActive, cancellationToken)) throw new ConflictException("This QR identifier is already in use.");
        var table = new DiningTable { BranchId = branchId, AreaId = request.AreaId, TableNumber = request.TableNumber.Trim(), Name = request.Name, Capacity = request.Capacity, QrCodeIdentifier = request.QrCodeIdentifier, DisplayOrder = request.DisplayOrder };
        dbContext.DiningTables.Add(table); dbContext.TableStatusHistories.Add(new TableStatusHistory { TableId = table.Id, OldStatus = table.Status, NewStatus = table.Status, Reason = "Created", ChangedBy = currentUser.UserId });
        await auditWriter.WriteAsync("TableCreated", nameof(DiningTable), table.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToTableDetails(table);
    }

    public async Task<TableDetails?> UpdateTableAsync(Guid id, UpdateTableRequest request, CancellationToken cancellationToken)
    {
        var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (table is null) return null;
        await EnsureActiveBranchAccessAsync(table.BranchId, cancellationToken); ValidateTable(request.TableNumber, request.Capacity);
        if (!await dbContext.Areas.AnyAsync(x => x.Id == request.AreaId && x.BranchId == table.BranchId && x.IsActive, cancellationToken)) throw new ApplicationException("Area does not belong to the table branch or is inactive.");
        if (await dbContext.DiningTables.AnyAsync(x => x.Id != id && x.BranchId == table.BranchId && x.TableNumber == request.TableNumber.Trim() && x.IsActive, cancellationToken)) throw new ConflictException("A table with this number already exists in the branch.");
        if (!string.IsNullOrWhiteSpace(request.QrCodeIdentifier) && await dbContext.DiningTables.AnyAsync(x => x.Id != id && x.QrCodeIdentifier == request.QrCodeIdentifier && x.IsActive, cancellationToken)) throw new ConflictException("This QR identifier is already in use.");
        table.AreaId = request.AreaId; table.TableNumber = request.TableNumber.Trim(); table.Name = request.Name; table.Capacity = request.Capacity; table.QrCodeIdentifier = request.QrCodeIdentifier; table.DisplayOrder = request.DisplayOrder;
        await auditWriter.WriteAsync("TableUpdated", nameof(DiningTable), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToTableDetails(table);
    }

    public async Task<bool> SetTableStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (table is null) return false;
        await EnsureBranchAccessAsync(table.BranchId, cancellationToken); table.IsActive = isActive;
        await auditWriter.WriteAsync(isActive ? "TableActivated" : "TableDeactivated", nameof(DiningTable), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<bool> DeleteTableAsync(Guid id, CancellationToken cancellationToken)
    {
        var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (table is null) return false;
        await EnsureActiveBranchAccessAsync(table.BranchId, cancellationToken);

        if (table.Status == TableStatus.Occupied)
            throw new ApplicationException("Không thể xóa bàn đang có khách ngồi.");

        var hasActiveAllocations = await dbContext.OrderTableAllocations.AnyAsync(x => x.TableId == id && x.ReleasedAt == null, cancellationToken);
        if (hasActiveAllocations)
            throw new ApplicationException("Bàn đang có đơn hàng chưa hoàn tất.");

        var hasHistoricalAllocations = await dbContext.OrderTableAllocations.AnyAsync(x => x.TableId == id, cancellationToken);
        var hasHistoricalOrders = await dbContext.Orders.AnyAsync(x => x.DiningTableId == id, cancellationToken);

        if (hasHistoricalAllocations || hasHistoricalOrders)
        {
            table.IsActive = false;
        }
        else
        {
            var histories = await dbContext.TableStatusHistories.Where(x => x.TableId == id).ToListAsync(cancellationToken);
            dbContext.TableStatusHistories.RemoveRange(histories);
            dbContext.DiningTables.Remove(table);
        }

        await auditWriter.WriteAsync("TableDeleted", nameof(DiningTable), id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<TableDetails?> ChangeTableStatusAsync(Guid id, ChangeTableStatusRequest request, CancellationToken cancellationToken)
    {
        var table = await dbContext.DiningTables.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken);
        if (table is null) return null;
        await EnsureActiveBranchAccessAsync(table.BranchId, cancellationToken);
        if (!IsAllowedTransition(table.Status, request.Status))
            throw new ApplicationException($"Không thể chuyển trạng thái bàn từ {GetStatusName(table.Status)} sang {GetStatusName(request.Status)}.");

        // Nếu bàn đang Có khách hoặc chuyển về Trống/Đã đặt/Tạm ngưng, kiểm tra xem có đơn hàng chưa hoàn tất/thanh toán không
        if (table.Status == TableStatus.Occupied && request.Status != TableStatus.Occupied)
        {
            var hasActiveOrders = await dbContext.Orders.AnyAsync(
                x => x.DiningTableId == id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled,
                cancellationToken);
            if (hasActiveOrders)
            {
                throw new ApplicationException($"Bàn {table.TableNumber} đang có khách và đơn hàng chưa hoàn tất thanh toán. Vui lòng thanh toán tại POS hoặc hủy đơn trước khi đổi sang trạng thái {GetStatusName(request.Status)}.");
            }
        }
        else if (request.Status == TableStatus.Available)
        {
            var hasActiveOrders = await dbContext.Orders.AnyAsync(
                x => x.DiningTableId == id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled,
                cancellationToken);
            if (hasActiveOrders)
            {
                throw new ApplicationException($"Bàn {table.TableNumber} đang có đơn hàng chưa hoàn tất. Không thể chuyển sang trạng thái Trống.");
            }
        }

        var oldStatus = table.Status;
        table.Status = request.Status;
        dbContext.TableStatusHistories.Add(new TableStatusHistory { TableId = id, OldStatus = oldStatus, NewStatus = request.Status, Reason = request.Reason, ChangedBy = currentUser.UserId });
        await auditWriter.WriteAsync("TableStatusChanged", nameof(DiningTable), id, currentUser.Username, null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToTableDetails(table);
    }

    public Task<PublicTableInfo?> GetPublicTableAsync(string qrCodeIdentifier, CancellationToken cancellationToken)
    {
        var isGuid = Guid.TryParse(qrCodeIdentifier, out var parsedId);
        return (from table in dbContext.DiningTables.AsNoTracking()
                join branch in dbContext.Branches on table.BranchId equals branch.Id
                join area in dbContext.Areas on table.AreaId equals area.Id
                where (table.QrCodeIdentifier == qrCodeIdentifier || (isGuid && table.Id == parsedId)) && table.IsActive && branch.IsActive && area.IsActive
                select new PublicTableInfo(branch.Id, table.Id, branch.Name, area.Name, table.TableNumber, table.Name)).FirstOrDefaultAsync(cancellationToken);
    }

    private async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken cancellationToken)
    {
        if (currentUser.IsAdministrator) return;
        if (currentUser.UserId is not Guid userId || !await IsUserAllowedBranchAsync(userId, branchId, cancellationToken)) throw new ForbiddenException("You do not have access to this branch.");
    }

    private async Task EnsureActiveBranchAccessAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        if (!await dbContext.Branches.AnyAsync(x => x.Id == branchId && x.IsActive, cancellationToken)) throw new ApplicationException("Branch does not exist or is inactive.");
    }

    private async Task<bool> IsUserAllowedBranchAsync(Guid userId, Guid branchId, CancellationToken cancellationToken) =>
        await dbContext.UserBranchAccesses.AnyAsync(x => x.UserId == userId && x.BranchId == branchId && x.IsActive, cancellationToken)
        || await dbContext.Users.AnyAsync(x => x.Id == userId && x.EmployeeId != null && dbContext.Employees.Any(e => e.Id == x.EmployeeId && e.BranchId == branchId && e.IsActive), cancellationToken);

    private Task<List<Guid>> GetAccessibleBranchIdsAsync(CancellationToken cancellationToken) => dbContext.UserBranchAccesses.Where(x => x.UserId == currentUser.UserId && x.IsActive).Select(x => x.BranchId).Union(dbContext.Employees.Where(e => e.Id == dbContext.Users.Where(u => u.Id == currentUser.UserId).Select(u => u.EmployeeId).FirstOrDefault() && e.IsActive).Select(e => e.BranchId)).ToListAsync(cancellationToken);

    private static void ValidateText(string value, string field, int maxLength) { if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength) throw new ApplicationException($"{field} is required and must be at most {maxLength} characters."); }
    private static void ValidateTable(string number, int capacity) { ValidateText(number, "Table number", 50); if (capacity <= 0) throw new ApplicationException("Capacity must be greater than zero."); }
    private static bool IsAllowedTransition(TableStatus from, TableStatus to) => from == to || (from, to) switch { (TableStatus.Available, TableStatus.Occupied or TableStatus.Reserved or TableStatus.OutOfService) => true, (TableStatus.Occupied, TableStatus.Cleaning or TableStatus.Available) => true, (TableStatus.Reserved, TableStatus.Occupied or TableStatus.Available) => true, (TableStatus.Cleaning, TableStatus.Available or TableStatus.OutOfService) => true, (TableStatus.OutOfService, TableStatus.Available) => true, _ => false };
    private static BranchDetails ToBranchDetails(Branch x) => new(x.Id, x.Code, x.Name, x.Description, x.Phone, x.Email, x.Address, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static AreaDetails ToAreaDetails(Area x) => new(x.Id, x.BranchId, x.Name, x.Description, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static TableDetails ToTableDetails(DiningTable x) => new(x.Id, x.BranchId, x.AreaId, x.TableNumber, x.Name, x.Capacity, x.Status, x.QrCodeIdentifier, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static System.Linq.Expressions.Expression<Func<Branch, BranchDetails>> ToBranchDetails() => x => new BranchDetails(x.Id, x.Code, x.Name, x.Description, x.Phone, x.Email, x.Address, x.IsActive, x.CreatedAt, x.UpdatedAt);

    private static string GetStatusName(TableStatus status) => status switch
    {
        TableStatus.Available => "Trống",
        TableStatus.Occupied => "Có khách",
        TableStatus.Reserved => "Đã đặt",
        TableStatus.Cleaning => "Đang dọn",
        TableStatus.OutOfService => "Tạm ngưng",
        _ => status.ToString()
    };
}