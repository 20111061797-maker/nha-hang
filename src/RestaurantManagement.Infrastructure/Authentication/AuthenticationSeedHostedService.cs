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

            await SeedAllAsync(dbContext, passwordHasher, adminOptions.Value, demoUsersOptions.Value, logger, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during authentication seed. The application will continue running.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public static async Task SeedAllAsync(
        RestaurantDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        AdminSeedOptions? adminOpt,
        DemoUsersOptions? demoOpt,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await SeedRolesAndPermissionsAsync(dbContext, cancellationToken);
        await SeedAdminAsync(dbContext, passwordHasher, adminOpt ?? new AdminSeedOptions(), logger, cancellationToken);
        await SeedDemoUsersAsync(dbContext, passwordHasher, demoOpt ?? new DemoUsersOptions(), logger, cancellationToken);
    }

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

    private static async Task SeedAdminAsync(RestaurantDbContext dbContext, IPasswordHasher<User> passwordHasher, AdminSeedOptions options, ILogger logger, CancellationToken cancellationToken)
    {
        var username = !string.IsNullOrWhiteSpace(options.Username) ? options.Username : "admin";
        var email = !string.IsNullOrWhiteSpace(options.Email) ? options.Email : "admin@example.com";
        var password = !string.IsNullOrWhiteSpace(options.Password) ? options.Password : "Admin@123456Password";

        var adminRole = await dbContext.Roles.SingleAsync(x => x.Name == "Admin", cancellationToken);
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == username.ToLower() || x.Email.ToLower() == email.ToLower(), cancellationToken);
        if (user is null)
        {
            user = new User { Username = username, Email = email, IsActive = true };
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            user.IsActive = true;
            user.LockoutEndAt = null;
            user.AccessFailedCount = 0;
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == adminRole.Id, cancellationToken))
        {
            dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = adminRole.Id });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation("Admin seed verified for username {Username}", username);
    }

    private static async Task SeedDemoUsersAsync(RestaurantDbContext dbContext, IPasswordHasher<User> passwordHasher, DemoUsersOptions demoOptions, ILogger logger, CancellationToken cancellationToken)
    {
        var password = !string.IsNullOrWhiteSpace(demoOptions.Password) ? demoOptions.Password : "Demo@123456Password";

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
            var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == demoUser.Username || x.Email == demoUser.Email, cancellationToken);
            if (user is null)
            {
                user = new User
                {
                    Username = demoUser.Username,
                    Email = demoUser.Email,
                    IsActive = true
                };
                user.PasswordHash = passwordHasher.HashPassword(user, password);
                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            else
            {
                user.IsActive = true;
                user.LockoutEndAt = null;
                user.AccessFailedCount = 0;
                user.PasswordHash = passwordHasher.HashPassword(user, password);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            var role = await dbContext.Roles.SingleAsync(x => x.Name == demoUser.Role, cancellationToken);
            if (!await dbContext.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == role.Id, cancellationToken))
            {
                dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            if (demoUser.EmployeeCode is not null && demoUser.FullName is not null)
            {
                var employee = await dbContext.Employees.FirstOrDefaultAsync(
                    x => x.EmployeeCode == demoUser.EmployeeCode && x.BranchId == defaultBranch.Id,
                    cancellationToken);

                if (employee is null)
                {
                    employee = new Employee
                    {
                        EmployeeCode = demoUser.EmployeeCode,
                        FullName = demoUser.FullName,
                        BranchId = defaultBranch.Id,
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