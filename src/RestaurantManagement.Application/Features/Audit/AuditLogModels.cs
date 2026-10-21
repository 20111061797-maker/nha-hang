namespace RestaurantManagement.Application.Features.Audit;

public sealed record AuditActorItem(
    Guid? UserId,
    string Username,
    string FullName);

public sealed record AuditLogListItem(
    Guid Id,
    DateTimeOffset CreatedAt,
    Guid? UserId,
    string Username,
    string FullName,
    string Action,
    string ActionTitle,
    string ActionCategory,
    string EntityType,
    Guid? EntityId,
    string? IpAddress,
    string? MetadataJson);

public sealed record AuditLogFilterRequest(
    string? Search = null,
    Guid? UserId = null,
    string? Action = null,
    string? ActionCategory = null,
    string? EntityType = null,
    DateTimeOffset? FromDate = null,
    DateTimeOffset? ToDate = null,
    int Page = 1,
    int PageSize = 25);

public sealed record AuditLogPagedResponse(
    IReadOnlyList<AuditLogListItem> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record AuditLogStatsResponse(
    int TotalLogs,
    int TodayLogs,
    int ActiveUsersCount,
    DateTimeOffset? LatestActivityAt);

public interface IAuditLogService
{
    Task<AuditLogPagedResponse> GetLogsAsync(AuditLogFilterRequest filter, CancellationToken ct);
    Task<AuditLogStatsResponse> GetStatsAsync(CancellationToken ct);
    Task<IReadOnlyList<string>> GetActionTypesAsync(CancellationToken ct);
    Task<IReadOnlyList<AuditActorItem>> GetActorsAsync(CancellationToken ct);
}
