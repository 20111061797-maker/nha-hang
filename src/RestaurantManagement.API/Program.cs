using Microsoft.EntityFrameworkCore;
using RestaurantManagement.API.Extensions;
using RestaurantManagement.API.Hubs;
using RestaurantManagement.API.Middleware;
using RestaurantManagement.Application;
using RestaurantManagement.Infrastructure;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Logging.AddJsonConsole();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

// Tự động chạy EF Core migration khi ứng dụng khởi động.
await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    for (var attempt = 1; attempt <= 3; attempt++)
    {
        try
        {
            logger.LogInformation("Applying database migrations (attempt {Attempt}/3)...", attempt);
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database migration attempt {Attempt} failed.", attempt);
            if (attempt == 3)
            {
                logger.LogError(ex, "All database migration attempts failed. The application will continue starting so health check endpoints remain available.");
            }
            else
            {
                await Task.Delay(2000);
            }
        }
    }

    try
    {
        var passwordHasher = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.IPasswordHasher<RestaurantManagement.Domain.Entities.User>>();
        var adminOptions = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<RestaurantManagement.Application.Common.Models.AdminSeedOptions>>().Value;
        var demoOptions = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<RestaurantManagement.Application.Common.Models.DemoUsersOptions>>().Value;
        await RestaurantManagement.Infrastructure.Authentication.AuthenticationSeedHostedService.SeedAllAsync(
            dbContext, passwordHasher, adminOptions, demoOptions, logger, CancellationToken.None);
        logger.LogInformation("Database seeded successfully during startup.");

        // Khôi phục trạng thái active cho các món ăn có trong chi nhánh nhưng bị ngưng bán nhầm
        await dbContext.Database.ExecuteSqlRawAsync(
            "UPDATE products SET is_active = true WHERE is_active = false AND id IN (SELECT product_id FROM branch_products WHERE is_active = true);");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Initial seeding was deferred: {Message}", ex.Message);
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/healthz");
app.MapGet("/", () => Results.Ok(new
{
    status = "healthy",
    name = "Restaurant Management API",
    version = "1.0.0",
    timestamp = DateTime.UtcNow
}));
app.MapPost("/api/auth/seed", async (RestaurantDbContext dbContext, Microsoft.AspNetCore.Identity.IPasswordHasher<RestaurantManagement.Domain.Entities.User> hasher, ILogger<Program> logger) =>
{
    await RestaurantManagement.Infrastructure.Authentication.AuthenticationSeedHostedService.SeedAllAsync(
        dbContext, hasher, new RestaurantManagement.Application.Common.Models.AdminSeedOptions(), new RestaurantManagement.Application.Common.Models.DemoUsersOptions(), logger, CancellationToken.None);
    var users = await dbContext.Users.Select(u => new { u.Username, u.Email, u.IsActive }).ToListAsync();
    return Results.Ok(new { message = "Database seeded successfully", users });
});
app.MapGet("/api/auth/users", async (RestaurantDbContext dbContext) =>
{
    var users = await dbContext.Users.Select(u => new { u.Username, u.Email, u.IsActive }).ToListAsync();
    return Results.Ok(users);
});
app.MapControllers();
app.MapHub<RestaurantHub>("/hubs/restaurant");
app.MapHub<KitchenHub>("/hubs/kitchen");

app.Run();

public partial class Program;
