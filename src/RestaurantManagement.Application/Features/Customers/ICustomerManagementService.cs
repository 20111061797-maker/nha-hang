namespace RestaurantManagement.Application.Features.Customers;

public interface ICustomerManagementService
{
    Task<IReadOnlyList<CustomerListItem>> GetCustomersAsync(string? search, CancellationToken ct);
    Task<CustomerDetails?> GetCustomerAsync(Guid id, CancellationToken ct);
    Task<CustomerDetails> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken ct);
    Task<CustomerDetails?> UpdateCustomerAsync(Guid id, UpdateCustomerRequest request, CancellationToken ct);
    Task<CustomerDetails?> AdjustPointsAsync(Guid id, AdjustCustomerPointsRequest request, CancellationToken ct);
    Task<IReadOnlyList<MembershipLevelDto>> GetMembershipLevelsAsync(CancellationToken ct);
}
