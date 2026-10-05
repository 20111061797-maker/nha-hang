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
        var connectionString = ResolvePostgresConnectionString(configuration);

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
        {
            var redisOptions = ResolveRedisConfiguration(configuration);
            return ConnectionMultiplexer.Connect(redisOptions);
        });

        services.AddJwtAuthentication(configuration);
        return services;
    }

    private static string ResolvePostgresConnectionString(IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(raw))
        {
            raw = Environment.GetEnvironmentVariable("DATABASE_URL")
                ?? Environment.GetEnvironmentVariable("POSTGRES_URL")
                ?? Environment.GetEnvironmentVariable("DATABASE_PRIVATE_URL")
                ?? Environment.GetEnvironmentVariable("DATABASE_PUBLIC_URL");
        }

        if (string.IsNullOrWhiteSpace(raw))
        {
            var host = Environment.GetEnvironmentVariable("PGHOST");
            if (!string.IsNullOrWhiteSpace(host))
            {
                var port = Environment.GetEnvironmentVariable("PGPORT") ?? "5432";
                var user = Environment.GetEnvironmentVariable("PGUSER") ?? "postgres";
                var pass = Environment.GetEnvironmentVariable("PGPASSWORD") ?? "";
                var db = Environment.GetEnvironmentVariable("PGDATABASE") ?? "railway";
                return $"Host={host};Port={port};Username={user};Password={pass};Database={db};Include Error Detail=true;SSL Mode=Prefer;Trust Server Certificate=true;";
            }

            return "Host=localhost;Port=5432;Database=restaurant_dev;Username=restaurant_user;Password=restaurant_password;Include Error Detail=true;";
        }

        if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(raw);
                var userInfo = uri.UserInfo.Split(':', 2);
                var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "postgres";
                var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');
                if (string.IsNullOrWhiteSpace(database)) database = "railway";

                return $"Host={host};Port={port};Username={user};Password={pass};Database={database};Include Error Detail=true;SSL Mode=Prefer;Trust Server Certificate=true;";
            }
            catch
            {
                return raw;
            }
        }

        return raw;
    }

    private static ConfigurationOptions ResolveRedisConfiguration(IConfiguration configuration)
    {
        var raw = configuration.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(raw))
        {
            raw = Environment.GetEnvironmentVariable("REDIS_URL")
                ?? Environment.GetEnvironmentVariable("REDIS_PRIVATE_URL")
                ?? Environment.GetEnvironmentVariable("REDIS_PUBLIC_URL");
        }

        if (string.IsNullOrWhiteSpace(raw))
        {
            var host = Environment.GetEnvironmentVariable("REDISHOST");
            if (!string.IsNullOrWhiteSpace(host))
            {
                var port = Environment.GetEnvironmentVariable("REDISPORT") ?? "6379";
                var pass = Environment.GetEnvironmentVariable("REDISPASSWORD") ?? Environment.GetEnvironmentVariable("REDIS_PASSWORD");
                var opt = new ConfigurationOptions
                {
                    EndPoints = { $"{host}:{port}" },
                    AbortOnConnectFail = false,
                    ConnectTimeout = 5000,
                    SyncTimeout = 5000
                };
                if (!string.IsNullOrEmpty(pass)) opt.Password = pass;
                return opt;
            }
            raw = "localhost:6379";
        }

        if (raw.StartsWith("redis://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(raw);
                var userInfo = uri.UserInfo.Split(':', 2);
                var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : (userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : null);
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 6379;

                var opt = new ConfigurationOptions
                {
                    EndPoints = { $"{host}:{port}" },
                    AbortOnConnectFail = false,
                    ConnectTimeout = 5000,
                    SyncTimeout = 5000
                };
                if (!string.IsNullOrEmpty(pass)) opt.Password = pass;
                return opt;
            }
            catch
            {
                // fallback
            }
        }

        try
        {
            var options = ConfigurationOptions.Parse(raw);
            options.AbortOnConnectFail = false;
            options.ConnectTimeout = 5000;
            options.SyncTimeout = 5000;
            return options;
        }
        catch
        {
            return new ConfigurationOptions
            {
                EndPoints = { "localhost:6379" },
                AbortOnConnectFail = false
            };
        }
    }
}