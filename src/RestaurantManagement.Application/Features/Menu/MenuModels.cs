using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Menu;

public sealed record CategoryListItem(Guid Id, string Name, string? Description, Guid? ParentId, int DisplayOrder, bool IsActive);
public sealed record CategoryDetails(Guid Id, string Name, string? Description, Guid? ParentId, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateCategoryRequest(string Name, string? Description, Guid? ParentId, int DisplayOrder);
public sealed record UpdateCategoryRequest(string Name, string? Description, Guid? ParentId, int DisplayOrder);

public sealed record ProductListItem(Guid Id, string Sku, string Name, string? Description, string? ShortDescription, int DisplayOrder, bool IsActive, string? ImageUrl = null);
public sealed record ProductDetails(Guid Id, string Sku, string Name, string? Description, string? ShortDescription, int DisplayOrder, bool IsActive, IReadOnlyList<Guid> CategoryIds, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, string? ImageUrl = null);
public sealed record CreateProductRequest(string Sku, string Name, string? Description, string? ShortDescription, int DisplayOrder, IReadOnlyList<Guid> CategoryIds, string? ImageUrl = null);
public sealed record UpdateProductRequest(string Sku, string Name, string? Description, string? ShortDescription, int DisplayOrder, IReadOnlyList<Guid> CategoryIds, string? ImageUrl = null);
public sealed record AssignCategoriesRequest(IReadOnlyList<Guid> CategoryIds);

public sealed record VariantListItem(Guid Id, Guid ProductId, string Name, string? Sku, decimal? Price, int DisplayOrder, bool IsActive);
public sealed record VariantDetails(Guid Id, Guid ProductId, string Name, string? Sku, decimal? Price, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateVariantRequest(string Name, string? Sku, decimal? Price, int DisplayOrder);
public sealed record UpdateVariantRequest(string Name, string? Sku, decimal? Price, int DisplayOrder);

public sealed record ProductImageItem(Guid Id, Guid ProductId, string Url, string? AltText, int DisplayOrder, bool IsPrimary, bool IsActive);
public sealed record CreateProductImageRequest(string Url, string? AltText, int DisplayOrder, bool IsPrimary);
public sealed record UpdateProductImageRequest(string Url, string? AltText, int DisplayOrder, bool IsPrimary);

public sealed record BranchProductItem(Guid Id, Guid BranchId, Guid ProductId, string ProductName, string Sku, decimal Price, bool IsAvailable, bool IsActive, string? ImageUrl = null);
public sealed record CreateBranchProductRequest(Guid ProductId, decimal Price, bool IsAvailable);
public sealed record UpdateBranchProductRequest(decimal Price);
public sealed record AvailabilityRequest(bool IsAvailable);

public sealed record MenuResponse(Guid BranchId, IReadOnlyList<MenuCategory> Categories, IReadOnlyList<MenuCombo> Combos);
public sealed record MenuCategory(Guid Id, string Name, int DisplayOrder, IReadOnlyList<MenuProduct> Products);
public sealed record MenuProduct(Guid Id, string Sku, string Name, string? Description, string? ShortDescription, decimal Price, IReadOnlyList<MenuVariant> Variants, IReadOnlyList<MenuModifierGroup> ModifierGroups, string? ImageUrl = null);
public sealed record MenuVariant(Guid Id, string Name, decimal Price, int DisplayOrder);
public sealed record MenuModifierGroup(Guid Id, string Name, int MinSelections, int MaxSelections, bool IsRequired, IReadOnlyList<MenuModifier> Modifiers);
public sealed record MenuModifier(Guid Id, string Name, decimal Price, int DisplayOrder);
public sealed record MenuCombo(Guid Id, string Code, string Name, string? Description, decimal Price, int DisplayOrder, IReadOnlyList<MenuComboItem> Items);
public sealed record MenuComboItem(Guid ProductId, Guid? ProductVariantId, int Quantity, int DisplayOrder);