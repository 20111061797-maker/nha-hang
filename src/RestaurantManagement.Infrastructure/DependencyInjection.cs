using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Common.Models;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Application.Features.Modifiers;
using RestaurantManagement.Application.Features.Pricing;
using RestaurantManagement.Application.Features.Orders;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Application.Features.Payments;
using RestaurantManagement.Application.Features.Customers;
using RestaurantManagement.Infrastructure.Authentication;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using RestaurantManagement.Infrastructure.Services;
using StackExchange.Redis;
using Microsoft.AspNetCore.Identity;
using RestaurantManagement.Domain.Entities;

namespace RestaurantManagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is missing.");

        services.AddDbContext<RestaurantDbContext>(options => options
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly(typeof(RestaurantDbContext).Assembly.FullName))
            .UseSnakeCaseNamingConvention());
        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<RestaurantDbContext>());
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<IAuditWriter, AuditWriter>();
        services.AddScoped<IBranchManagementService, BranchManagementService>();
        services.AddScoped<IMenuManagementService, MenuManagementService>();
        services.AddScoped<IModifierComboService, ModifierComboService>();
        services.AddScoped<IProductPricingService, ProductPricingService>();
        services.AddScoped<IOrderService, OrderManagementService>();
        services.AddScoped<IPaymentService, PaymentManagementService>();
        services.AddScoped<IKitchenService, KitchenManagementService>();
        services.AddScoped<ICustomerManagementService, CustomerManagementService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<IEmailSender, DevelopmentEmailSender>();
        services.Configure<AdminSeedOptions>(configuration.GetSection(AdminSeedOptions.SectionName));
        services.Configure<DemoUsersOptions>(configuration.GetSection(DemoUsersOptions.SectionName));
        services.AddHostedService<AuthenticationSeedHostedService>();

        services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis") ?? "localhost:6379"));

        services.AddJwtAuthentication(configuration);
        return services;
    }
}