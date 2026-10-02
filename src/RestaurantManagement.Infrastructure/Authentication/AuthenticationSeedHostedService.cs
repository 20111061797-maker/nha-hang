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
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        await SeedRolesAndPermissionsAsync(dbContext, cancellationToken);
        await SeedAdminAsync(dbContext, passwordHasher, cancellationToken);
        await SeedDemoUsersAsync(dbContext, passwordHasher, cancellationToken);
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
            ["Cashier"] = ["branch.read", "area.read", "table.read", "table.change_status"],
            ["Waiter"] = ["branch.read", "area.read", "table.read", "table.change_status"],
            ["Kitchen"] = ["branch.read", "area.read", "table.read"],
            ["Delivery"] = ["branch.read", "area.read", "table.read"]
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

        var demoUsers = new[]
        {
            (Username: "owner", Email: "owner@example.com", Role: "Owner"),
            (Username: "manager", Email: "manager@example.com", Role: "Manager"),
            (Username: "cashier", Email: "cashier@example.com", Role: "Cashier"),
            (Username: "waiter", Email: "waiter@example.com", Role: "Waiter"),
            (Username: "kitchen", Email: "kitchen@example.com", Role: "Kitchen"),
            (Username: "delivery", Email: "delivery@example.com", Role: "Delivery")
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
                user.PasswordHash = passwordHasher.HashPassword(user, demoOptions.Password);
                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            var role = await dbContext.Roles.SingleAsync(x => x.Name == demoUser.Role, cancellationToken);
            if (!await dbContext.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == role.Id, cancellationToken))
            {
                dbContext.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        logger.LogInformation("Development demo users verified for roles Owner, Manager, Cashier, Waiter, Kitchen and Delivery");
    }
}