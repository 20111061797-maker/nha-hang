using System.Text.Json;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class AuditWriter(RestaurantDbContext dbContext, ICurrentUserService currentUserService) : IAuditWriter
{
    public Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken)
    {
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = currentUserService.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ActorNameSnapshot = actorName,
            IpAddress = ipAddress,
            MetadataJson = JsonSerializer.Serialize(new { source = "api" })
        });
        return Task.CompletedTask;
    }
}