namespace RestaurantManagement.Application.Features.Employees;

public sealed record EmployeeListItem(
    Guid Id,
    Guid BranchId,
    string BranchName,
    string EmployeeCode,
    string FullName,
    string? Phone,
    bool IsActive,
    Guid? UserId,
    string? Username,
    string? Email,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt);

public sealed record EmployeeDetails(
    Guid Id,
    Guid BranchId,
    string BranchName,
    string EmployeeCode,
    string FullName,
    string? Phone,
    bool IsActive,
    Guid? UserId,
    string? Username,
    string? Email,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateEmployeeRequest(
    Guid BranchId,
    string? EmployeeCode,
    string FullName,
    string? Phone,
    string? Role,
    bool CreateLoginAccount,
    string? Username,
    string? Password,
    string? Email);

public sealed record UpdateEmployeeRequest(
    Guid BranchId,
    string FullName,
    string? Phone,
    bool IsActive,
    string? Role,
    string? NewPassword);

public sealed record RoleItem(
    Guid Id,
    string Name,
    string? Description);

public interface IEmployeeManagementService
{
    Task<IReadOnlyList<EmployeeListItem>> GetEmployeesAsync(Guid? branchId, string? search, bool? isActive, CancellationToken ct);
    Task<EmployeeDetails?> GetEmployeeAsync(Guid id, CancellationToken ct);
    Task<EmployeeDetails> CreateEmployeeAsync(CreateEmployeeRequest request, CancellationToken ct);
    Task<EmployeeDetails?> UpdateEmployeeAsync(Guid id, UpdateEmployeeRequest request, CancellationToken ct);
    Task<bool> DeleteEmployeeAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<RoleItem>> GetRolesAsync(CancellationToken ct);
}
