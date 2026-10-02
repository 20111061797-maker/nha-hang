using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Branches;

public sealed record BranchListItem(Guid Id, string Code, string Name, string? Description, string? Phone, string? Email, string? Address, bool IsActive);
public sealed record BranchDetails(Guid Id, string Code, string Name, string? Description, string? Phone, string? Email, string? Address, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateBranchRequest(string Code, string Name, string? Description, string? Phone, string? Email, string? Address);
public sealed record UpdateBranchRequest(string Code, string Name, string? Description, string? Phone, string? Email, string? Address);
public sealed record SetStatusRequest(bool IsActive);

public sealed record AreaListItem(Guid Id, Guid BranchId, string Name, string? Description, int DisplayOrder, bool IsActive);
public sealed record AreaDetails(Guid Id, Guid BranchId, string Name, string? Description, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateAreaRequest(string Name, string? Description, int DisplayOrder);
public sealed record UpdateAreaRequest(string Name, string? Description, int DisplayOrder);

public sealed record TableListItem(Guid Id, Guid BranchId, Guid AreaId, string TableNumber, string? Name, int Capacity, TableStatus Status, string? QrCodeIdentifier, int DisplayOrder, bool IsActive);
public sealed record TableDetails(Guid Id, Guid BranchId, Guid AreaId, string TableNumber, string? Name, int Capacity, TableStatus Status, string? QrCodeIdentifier, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateTableRequest(Guid AreaId, string TableNumber, string? Name, int Capacity, string? QrCodeIdentifier, int DisplayOrder);
public sealed record UpdateTableRequest(Guid AreaId, string TableNumber, string? Name, int Capacity, string? QrCodeIdentifier, int DisplayOrder);
public sealed record ChangeTableStatusRequest(TableStatus Status, string? Reason);
public sealed record PublicTableInfo(string BranchName, string AreaName, string TableNumber, string? TableName);