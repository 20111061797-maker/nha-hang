namespace RestaurantManagement.Application.Common.Interfaces;

public interface IKitchenBranchAccess
{
    Task EnsureAsync(Guid branchId, CancellationToken cancellationToken);
}