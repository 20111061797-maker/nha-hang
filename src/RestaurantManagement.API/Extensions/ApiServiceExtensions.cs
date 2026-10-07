namespace RestaurantManagement.API.Extensions;

using System.Threading.RateLimiting;

public static class ApiServiceExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
            });
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
                var hasWildcard = origins.Any(o => string.IsNullOrWhiteSpace(o) || o.Trim() == "*");
                var validOrigins = origins
                    .Where(o => !string.IsNullOrWhiteSpace(o) && o.Trim() != "*")
                    .Select(o => o.Trim().TrimEnd('/'))
                    .Distinct()
                    .ToArray();

                if (hasWildcard || validOrigins.Length == 0)
                {
                    policy.SetIsOriginAllowed(_ => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                }
                else
                {
                    policy.WithOrigins(validOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                }
            });
        });

        return services;
    }
}