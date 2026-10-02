namespace RestaurantManagement.Application.Features.Menu;

public interface IMenuManagementService
{
    Task<IReadOnlyList<CategoryListItem>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<CategoryDetails?> GetCategoryAsync(Guid id, CancellationToken cancellationToken);
    Task<CategoryDetails> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryDetails?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<bool> SetCategoryStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProductListItem>> GetProductsAsync(CancellationToken cancellationToken);
    Task<ProductDetails?> GetProductAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductDetails> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductDetails?> UpdateProductAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task<bool> SetProductStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<ProductDetails?> AssignCategoriesAsync(Guid productId, AssignCategoriesRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<VariantListItem>> GetVariantsAsync(Guid productId, CancellationToken cancellationToken);
    Task<VariantDetails> CreateVariantAsync(Guid productId, CreateVariantRequest request, CancellationToken cancellationToken);
    Task<VariantDetails?> GetVariantAsync(Guid id, CancellationToken cancellationToken);
    Task<VariantDetails?> UpdateVariantAsync(Guid id, UpdateVariantRequest request, CancellationToken cancellationToken);
    Task<bool> SetVariantStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProductImageItem>> GetImagesAsync(Guid productId, CancellationToken cancellationToken);
    Task<ProductImageItem> CreateImageAsync(Guid productId, CreateProductImageRequest request, CancellationToken cancellationToken);
    Task<ProductImageItem?> UpdateImageAsync(Guid id, UpdateProductImageRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteImageAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<BranchProductItem>> GetBranchProductsAsync(Guid branchId, CancellationToken cancellationToken);
    Task<BranchProductItem> CreateBranchProductAsync(Guid branchId, CreateBranchProductRequest request, CancellationToken cancellationToken);
    Task<BranchProductItem?> GetBranchProductAsync(Guid id, CancellationToken cancellationToken);
    Task<BranchProductItem?> UpdateBranchProductAsync(Guid id, UpdateBranchProductRequest request, CancellationToken cancellationToken);
    Task<bool> SetBranchProductStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<BranchProductItem?> SetBranchProductAvailabilityAsync(Guid id, bool isAvailable, CancellationToken cancellationToken);
    Task<MenuResponse> GetMenuAsync(Guid branchId, CancellationToken cancellationToken);
}