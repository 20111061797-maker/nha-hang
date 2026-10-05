namespace RestaurantManagement.Application.Features.Customers;

public sealed record CustomerListItem(
    Guid Id,
    string FullName,
    string Phone,
    string? Email,
    bool IsActive,
    string MembershipLevelCode,
    string MembershipLevelName,
    int LoyaltyPoints,
    int TotalOrders,
    decimal TotalSpent,
    DateTimeOffset CreatedAt);

public sealed record CustomerPointTransactionDetails(
    Guid Id,
    Guid? OrderId,
    int PointsDelta,
    string Reason,
    DateTimeOffset CreatedAt);

public sealed record CustomerDetails(
    Guid Id,
    string FullName,
    string Phone,
    string? Email,
    bool IsActive,
    string MembershipLevelCode,
    string MembershipLevelName,
    int LoyaltyPoints,
    int TotalOrders,
    decimal TotalSpent,
    DateTimeOffset CreatedAt,
    IReadOnlyList<CustomerPointTransactionDetails> PointTransactions);

public sealed record CreateCustomerRequest(
    string FullName,
    string Phone,
    string? Email,
    string? Address,
    int InitialPoints = 0);

public sealed record UpdateCustomerRequest(
    string FullName,
    string Phone,
    string? Email,
    bool IsActive);

public sealed record AdjustCustomerPointsRequest(
    int PointsDelta,
    string Reason,
    Guid? OrderId = null);

public sealed record MembershipLevelDto(
    Guid Id,
    string Code,
    string Name,
    int MinimumPoints);
