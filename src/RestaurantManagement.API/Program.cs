using RestaurantManagement.API.Extensions;
using RestaurantManagement.API.Hubs;
using RestaurantManagement.API.Middleware;
using RestaurantManagement.Application;
using RestaurantManagement.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddJsonConsole();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

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
