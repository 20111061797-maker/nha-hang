namespace RestaurantManagement.API.Extensions;

using System.Threading.RateLimiting;

public static class ApiServiceExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers();
        services.AddHttpContextAccessor();
        services.AddScoped<RestaurantManagement.Application.Common.Interfaces.ICurrentUserService, Services.HttpCurrentUserService>();
        services.AddProblemDetails();
        services.AddApiSwagger();
        services.AddHealthChecks();
        services.AddSignalR();
        services.AddScoped<RestaurantManagement.Application.Features.Kitchen.IKitchenEventPublisher, Services.KitchenSignalRPublisher>();
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                }));
        });
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
                policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
            });
        });

        return services;
    }
}