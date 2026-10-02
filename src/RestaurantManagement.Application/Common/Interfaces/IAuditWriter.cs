namespace RestaurantManagement.Application.Common.Interfaces;

public interface IAuditWriter
{
    Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken);
}