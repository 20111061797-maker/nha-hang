namespace RestaurantManagement.Application.Features.Branches;

public interface IBranchManagementService
{
    Task<IReadOnlyList<BranchListItem>> GetBranchesAsync(CancellationToken cancellationToken);
    Task<BranchDetails?> GetBranchAsync(Guid id, CancellationToken cancellationToken);
    Task<BranchDetails> CreateBranchAsync(CreateBranchRequest request, CancellationToken cancellationToken);
    Task<BranchDetails?> UpdateBranchAsync(Guid id, UpdateBranchRequest request, CancellationToken cancellationToken);
    Task<bool> SetBranchStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);

    Task<IReadOnlyList<AreaListItem>> GetAreasAsync(Guid branchId, CancellationToken cancellationToken);
    Task<AreaDetails?> GetAreaAsync(Guid id, CancellationToken cancellationToken);
    Task<AreaDetails> CreateAreaAsync(Guid branchId, CreateAreaRequest request, CancellationToken cancellationToken);
    Task<AreaDetails?> UpdateAreaAsync(Guid id, UpdateAreaRequest request, CancellationToken cancellationToken);
    Task<bool> SetAreaStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);

    Task<IReadOnlyList<TableListItem>> GetTablesAsync(Guid branchId, CancellationToken cancellationToken);
    Task<TableDetails?> GetTableAsync(Guid id, CancellationToken cancellationToken);
    Task<TableDetails> CreateTableAsync(Guid branchId, CreateTableRequest request, CancellationToken cancellationToken);
    Task<TableDetails?> UpdateTableAsync(Guid id, UpdateTableRequest request, CancellationToken cancellationToken);
    Task<bool> SetTableStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<TableDetails?> ChangeTableStatusAsync(Guid id, ChangeTableStatusRequest request, CancellationToken cancellationToken);
    Task<PublicTableInfo?> GetPublicTableAsync(string qrCodeIdentifier, CancellationToken cancellationToken);
}