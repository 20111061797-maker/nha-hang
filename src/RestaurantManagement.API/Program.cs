using Microsoft.EntityFrameworkCore;
using RestaurantManagement.API.Extensions;
using RestaurantManagement.API.Hubs;
using RestaurantManagement.API.Middleware;
using RestaurantManagement.Application;
using RestaurantManagement.Infrastructure;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddJsonConsole();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

// Tự động chạy EF Core migration khi ứng dụng khởi động.
// Điều này đảm bảo database luôn có schema mới nhất trước khi các Hosted Service
// (ví dụ AuthenticationSeedHostedService) bắt đầu truy vấn database.
await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Applying database migrations...");
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while applying database migrations.");
        throw;
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
app.MapControllers();
app.MapHub<RestaurantHub>("/hubs/restaurant");
app.MapHub<KitchenHub>("/hubs/kitchen");

app.Run();

public partial class Program;
