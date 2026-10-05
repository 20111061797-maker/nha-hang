using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantManagement.Application.Common.Models;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Authentication;

public sealed class AuthenticationSeedHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<AdminSeedOptions> adminOptions,
    IOptions<DemoUsersOptions> demoUsersOptions,
    ILogger<AuthenticationSeedHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

            await SeedRolesAndPermissionsAsync(dbContext, cancellationToken);
            await SeedAdminAsync(dbContext, passwordHasher, cancellationToken);
            await SeedDemoUsersAsync(dbContext, passwordHasher, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during authentication seed. The application will continue running.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static async Task SeedRolesAndPermissionsAsync(RestaurantDbContext dbContext, CancellationToken cancellationToken)
    {
        var roleNames = new[] { "Admin", "Owner", "Manager", "Cashier", "Waiter", "Kitchen", "Delivery" };
        foreach (var roleName in roleNames)
        {
            if (!await dbContext.Roles.AnyAsync(x => x.Name == roleName, cancellationToken))
            {
                dbContext.Roles.Add(new Role { Name = roleName, Description = $"{roleName} role" });
            }
        }

        foreach (var code in PermissionCodes.All)
        {
            if (!await dbContext.Permissions.AnyAsync(x => x.Code == code, cancellationToken))
            {
                dbContext.Permissions.Add(new Permission { Code = code, Description = code });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        var adminRole = await dbContext.Roles.SingleAsync(x => x.Name == "Admin", cancellationToken);
        var permissions = await dbContext.Permissions.ToListAsync(cancellationToken);
        await EnsureRolePermissionsAsync(dbContext, adminRole, permissions, PermissionCodes.All, cancellationToken);

        var rolePermissionMap = new Dictionary<string, string[]>
        {
            ["Owner"] = PermissionCodes.All,
            ["Manager"] = PermissionCodes.All,
            ["Cashier"] = [
                "branch.read", "area.read", "table.read", "table.create", "table.update", "table.change_status", "table.manage",
                "order.read", "order.create", "order.update", "order.cancel", "order.complete", "order.manage",
                "order.add_item", "order.update_item", "order.remove_item", "order.change_status",
                "payment.read", "payment.create", "payment.complete", "payment.cancel", "payment.refund", "payment.manage",
                "product.read", "category.read", "menu.read", "modifier.read", "modifier.group.read", "combo.read",
                "customer.read", "customer.create", "customer.update", "customer.manage"
            ],
            ["Waiter"] = [
                "branch.read", "area.read", "table.read", "table.change_status",
                "order.read", "order.create", "order.update", "order.add_item", "order.update_item", "order.remove_item", "order.change_status",
                "product.read", "category.read", "menu.read",
                "customer.read", "customer.create"
            ],
            ["Kitchen"] = ["branch.read", "area.read", "table.read", "kitchen.station.read", "kitchen.station.create", "kitchen.station.update", "kitchen.station.manage", "kitchen.order.read", "kitchen.order.update", "kitchen.order.change_status", "kitchen.order.manage", "menu.read", "product.read"],
            ["Delivery"] = ["branch.read", "area.read", "table.read", "order.read"]
        };

        foreach (var (roleName, permissionCodes) in rolePermissionMap)
        {
            var role = await dbContext.Roles.SingleAsync(x => x.Name == roleName, cancellationToken);
            await EnsureRolePermissionsAsync(dbContext, role, permissions, permissionCodes, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureRolePermissionsAsync(RestaurantDbContext dbContext, Role role, IReadOnlyCollection<Permission> permissions, IEnumerable<string> permissionCodes, CancellationToken cancellationToken)
    {
        foreach (var permission in permissions.Where(x => permissionCodes.Contains(x.Code, StringComparer.Ordinal)))
        {
            if (!await dbContext.RolePermissions.AnyAsync(x => x.RoleId == role.Id && x.PermissionId == permission.Id, cancellationToken))
            {
                dbContext.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
            }
        }
    }

    private async Task SeedAdminAsync(RestaurantDbContext dbContext, IPasswordHasher<User> passwordHasher, CancellationToken cancellationToken)
    {
        var options = adminOptions.Value;
        if (string.IsNullOrWhiteSpace(options.Username) || string.IsNullOrWhiteSpace(options.Email) || string.IsNullOrWhiteSpace(options.Password))
        {
            logger.LogInformation("Admin seed skipped because ADMIN__USERNAME, ADMIN__EMAIL or ADMIN__PASSWORD is not configured.");
            return;
        }

        var adminRole = await dbContext.Roles.SingleAsync(x => x.Name == "Admin", cancellationToken);
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == options.Username || x.Email == options.Email, cancellationToken);
        if (user is null)
        {
            user = new User { Username = options.Username, Email = options.Email, IsActive = true };
            user.PasswordHash = passwordHasher.HashPassword(user, options.Password);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == adminRole.Id, cancellationToken))
        {
            dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = adminRole.Id });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation("Admin seed verified for configured username {Username}", options.Username);
    }

    private async Task SeedDemoUsersAsync(RestaurantDbContext dbContext, IPasswordHasher<User> passwordHasher, CancellationToken cancellationToken)
    {
        var demoOptions = demoUsersOptions.Value;
        if (!demoOptions.Enabled || string.IsNullOrWhiteSpace(demoOptions.Password))
        {
            return;
        }

        // Đảm bảo có ít nhất 1 chi nhánh để demo users có thể truy cập.
        // Nếu chưa có chi nhánh nào, tạo 1 chi nhánh mặc định (idempotent).
        var defaultBranch = await dbContext.Branches.FirstOrDefaultAsync(cancellationToken);
        if (defaultBranch is null)
        {
            defaultBranch = new Branch
            {
                Code = "DEMO-MAIN",
                Name = "Chi nhánh Mẫu",
                Description = "Chi nhánh mặc định được tạo tự động cho môi trường demo.",
                IsActive = true
            };
            dbContext.Branches.Add(defaultBranch);
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Demo branch created: {BranchName} ({BranchCode})", defaultBranch.Name, defaultBranch.Code);
        }

        // Danh sách demo users: Username, Email, Role, EmployeeCode, FullName.
        // owner không có Employee (quản lý nhiều chi nhánh) — sẽ dùng UserBranchAccess.
        // Các vai trò vận hành cần Employee để JWT claim "branch_id" được nạp.
        var demoUsers = new[]
        {
            (Username: "owner",    Email: "owner@example.com",    Role: "Owner",    EmployeeCode: (string?)null,   FullName: (string?)null),
            (Username: "manager",  Email: "manager@example.com",  Role: "Manager",  EmployeeCode: "EMP-MGR-001",   FullName: "Demo Manager"),
            (Username: "cashier",  Email: "cashier@example.com",  Role: "Cashier",  EmployeeCode: "EMP-CSH-001",   FullName: "Demo Cashier"),
            (Username: "waiter",   Email: "waiter@example.com",   Role: "Waiter",   EmployeeCode: "EMP-WTR-001",   FullName: "Demo Waiter"),
            (Username: "kitchen",  Email: "kitchen@example.com",  Role: "Kitchen",  EmployeeCode: "EMP-KCH-001",   FullName: "Demo Kitchen"),
            (Username: "delivery", Email: "delivery@example.com", Role: "Delivery", EmployeeCode: "EMP-DLV-001",   FullName: "Demo Delivery")
        };

        foreach (var demoUser in demoUsers)
        {
            // 1. Tạo hoặc lấy User
            var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == demoUser.Username || x.Email == demoUser.Email, cancellationToken);
            if (user is null)
            {
                user = new User
                {
                    Username = demoUser.Username,
                    Email = demoUser.Email,
                    IsActive = true
                };
                user.PasswordHash = passwordHasher.HashPassword(user, demoOptions.Password);
                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            // 2. Gán Role cho User
            var role = await dbContext.Roles.SingleAsync(x => x.Name == demoUser.Role, cancellationToken);
            if (!await dbContext.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == role.Id, cancellationToken))
            {
                dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            // 3a. Với vai trò vận hành (có EmployeeCode): tạo Employee và liên kết với User.
            //     JWT sẽ nạp claim "branch_id" từ Employee.BranchId, cho phép KitchenHub hoạt động.
            if (demoUser.EmployeeCode is not null && demoUser.FullName is not null)
            {
                var employee = await dbContext.Employees.FirstOrDefaultAsync(
                    x => x.EmployeeCode == demoUser.EmployeeCode && x.BranchId == defaultBranch.Id,
                    cancellationToken);

                if (employee is null)
                {
                    employee = new Employee
                    {
                        BranchId = defaultBranch.Id,
                        EmployeeCode = demoUser.EmployeeCode,
                        FullName = demoUser.FullName,
                        IsActive = true
                    };
                    dbContext.Employees.Add(employee);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }

                // Liên kết User với Employee nếu chưa có
                if (user.EmployeeId != employee.Id)
                {
                    user.EmployeeId = employee.Id;
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            // 3b. Với owner (không có Employee): gán UserBranchAccess thay thế.
            //     owner dùng quyền truy cập chi nhánh qua UserBranchAccess.
            else
            {
                if (!await dbContext.UserBranchAccesses.AnyAsync(
                    x => x.UserId == user.Id && x.BranchId == defaultBranch.Id,
                    cancellationToken))
                {
                    dbContext.UserBranchAccesses.Add(new UserBranchAccess
                    {
                        UserId = user.Id,
                        BranchId = defaultBranch.Id,
                        IsActive = true
                    });
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }
        }

        logger.LogInformation(
            "Development demo users verified for roles Owner, Manager, Cashier, Waiter, Kitchen and Delivery. Default branch: {BranchName}",
            defaultBranch.Name);
    }
}