using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Employees;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class EmployeeManagementService(
    RestaurantDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IEmployeeManagementService
{
    public async Task<IReadOnlyList<EmployeeListItem>> GetEmployeesAsync(Guid? branchId, string? search, bool? isActive, CancellationToken ct)
    {
        var query = dbContext.Employees.AsNoTracking();

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(e => e.BranchId == branchId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(e => e.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(e => e.FullName.ToLower().Contains(s) || e.EmployeeCode.ToLower().Contains(s) || (e.Phone != null && e.Phone.Contains(s)));
        }

        var employees = await query.OrderBy(e => e.EmployeeCode).ToListAsync(ct);
        if (employees.Count == 0) return [];

        var employeeIds = employees.Select(e => e.Id).ToList();
        var branchIds = employees.Select(e => e.BranchId).Distinct().ToList();

        var branches = await dbContext.Branches.AsNoTracking()
            .Where(b => branchIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, b => b.Name, ct);

        var users = await dbContext.Users.AsNoTracking()
            .Where(u => u.EmployeeId != null && employeeIds.Contains(u.EmployeeId.Value))
            .ToListAsync(ct);

        var userIds = users.Select(u => u.Id).ToList();
        var userRoles = await (from ur in dbContext.UserRoles.AsNoTracking()
                               join r in dbContext.Roles.AsNoTracking() on ur.RoleId equals r.Id
                               where userIds.Contains(ur.UserId)
                               select new { ur.UserId, RoleName = r.Name }).ToListAsync(ct);

        var userRoleMap = userRoles.GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(x => x.RoleName).ToList());

        var userMap = users.ToDictionary(u => u.EmployeeId!.Value, u => u);

        return employees.Select(e =>
        {
            userMap.TryGetValue(e.Id, out var user);
            var roles = user != null && userRoleMap.TryGetValue(user.Id, out var rList) ? rList : [];
            branches.TryGetValue(e.BranchId, out var bName);

            return new EmployeeListItem(
                e.Id,
                e.BranchId,
                bName ?? "Chi nhánh",
                e.EmployeeCode,
                e.FullName,
                e.Phone,
                e.IsActive,
                user?.Id,
                user?.Username,
                user?.Email,
                roles,
                e.CreatedAt
            );
        }).ToList();
    }

    public async Task<EmployeeDetails?> GetEmployeeAsync(Guid id, CancellationToken ct)
    {
        var employee = await dbContext.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);
        if (employee is null) return null;

        var branch = await dbContext.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == employee.BranchId, ct);
        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.EmployeeId == employee.Id, ct);

        IReadOnlyList<string> roles = [];
        if (user is not null)
        {
            roles = await (from ur in dbContext.UserRoles.AsNoTracking()
                           join r in dbContext.Roles.AsNoTracking() on ur.RoleId equals r.Id
                           where ur.UserId == user.Id
                           select r.Name).ToListAsync(ct);
        }

        return new EmployeeDetails(
            employee.Id,
            employee.BranchId,
            branch?.Name ?? "Chi nhánh",
            employee.EmployeeCode,
            employee.FullName,
            employee.Phone,
            employee.IsActive,
            user?.Id,
            user?.Username,
            user?.Email,
            roles,
            employee.CreatedAt,
            employee.UpdatedAt
        );
    }

    public async Task<EmployeeDetails> CreateEmployeeAsync(CreateEmployeeRequest request, CancellationToken ct)
    {
        var branch = await dbContext.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId, ct)
            ?? throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Chi nhánh không tồn tại.");

        string code;
        if (!string.IsNullOrWhiteSpace(request.EmployeeCode))
        {
            code = request.EmployeeCode.Trim().ToUpperInvariant();
            if (await dbContext.Employees.AnyAsync(e => e.BranchId == branch.Id && e.EmployeeCode == code, ct))
            {
                throw new ConflictException($"Mã nhân viên {code} đã tồn tại trong chi nhánh này.");
            }
        }
        else
        {
            var count = await dbContext.Employees.CountAsync(e => e.BranchId == branch.Id, ct);
            code = $"NV{(count + 1):D3}";
            while (await dbContext.Employees.AnyAsync(e => e.BranchId == branch.Id && e.EmployeeCode == code, ct))
            {
                count++;
                code = $"NV{(count + 1):D3}";
            }
        }

        var employee = new Employee
        {
            BranchId = branch.Id,
            EmployeeCode = code,
            FullName = request.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            IsActive = true
        };

        dbContext.Employees.Add(employee);

        // Optional user account creation
        if (request.CreateLoginAccount && !string.IsNullOrWhiteSpace(request.Username) && !string.IsNullOrWhiteSpace(request.Password))
        {
            var username = request.Username.Trim().ToLowerInvariant();
            if (await dbContext.Users.AnyAsync(u => u.Username.ToLower() == username, ct))
            {
                throw new ConflictException($"Tên đăng nhập {username} đã tồn tại.");
            }

            var user = new User
            {
                Username = username,
                Email = string.IsNullOrWhiteSpace(request.Email) ? $"{username}@example.com" : request.Email.Trim(),
                IsActive = true,
                EmployeeId = employee.Id
            };
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            dbContext.Users.Add(user);

            // Assign role
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == request.Role.Trim().ToLower(), ct);
                if (role is not null)
                {
                    dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                }
            }

            // Assign branch access
            dbContext.UserBranchAccesses.Add(new UserBranchAccess
            {
                UserId = user.Id,
                BranchId = branch.Id,
                IsActive = true
            });
        }

        await auditWriter.WriteAsync("EmployeeCreated", nameof(Employee), employee.Id, currentUser.Username, null, ct);
        await dbContext.SaveChangesAsync(ct);

        return (await GetEmployeeAsync(employee.Id, ct))!;
    }

    public async Task<EmployeeDetails?> UpdateEmployeeAsync(Guid id, UpdateEmployeeRequest request, CancellationToken ct)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (employee is null) return null;

        employee.FullName = request.FullName.Trim();
        employee.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        employee.IsActive = request.IsActive;
        employee.BranchId = request.BranchId;
        employee.UpdatedAt = DateTimeOffset.UtcNow;

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.EmployeeId == employee.Id, ct);
        if (user is not null)
        {
            user.IsActive = request.IsActive;

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
            }

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == request.Role.Trim().ToLower(), ct);
                if (role is not null)
                {
                    var existingRoles = await dbContext.UserRoles.Where(ur => ur.UserId == user.Id).ToListAsync(ct);
                    dbContext.UserRoles.RemoveRange(existingRoles);
                    dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                }
            }
        }

        await auditWriter.WriteAsync("EmployeeUpdated", nameof(Employee), employee.Id, currentUser.Username, null, ct);
        await dbContext.SaveChangesAsync(ct);

        return await GetEmployeeAsync(id, ct);
    }

    public async Task<bool> DeleteEmployeeAsync(Guid id, CancellationToken ct)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (employee is null) return false;

        employee.IsActive = false;
        employee.UpdatedAt = DateTimeOffset.UtcNow;

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.EmployeeId == employee.Id, ct);
        if (user is not null)
        {
            user.IsActive = false;
        }

        await auditWriter.WriteAsync("EmployeeDeactivated", nameof(Employee), employee.Id, currentUser.Username, null, ct);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<RoleItem>> GetRolesAsync(CancellationToken ct)
    {
        var roles = await dbContext.Roles.AsNoTracking()
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        return roles.Select(r => new RoleItem(r.Id, r.Name, r.Description)).ToList();
    }
}
