using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Menu;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class MenuManagementService(
    RestaurantDbContext dbContext,
    ICurrentUserService currentUser,
    IAuditWriter auditWriter) : IMenuManagementService
{
    public async Task<IReadOnlyList<CategoryListItem>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        await dbContext.Categories.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).Select(x => new CategoryListItem(x.Id, x.Name, x.Description, x.ParentId, x.DisplayOrder, x.IsActive)).ToListAsync(cancellationToken);

    public async Task<CategoryDetails?> GetCategoryAsync(Guid id, CancellationToken cancellationToken) =>
        await dbContext.Categories.AsNoTracking().Where(x => x.Id == id).Select(x => new CategoryDetails(x.Id, x.Name, x.Description, x.ParentId, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt)).FirstOrDefaultAsync(cancellationToken);

    public async Task<CategoryDetails> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        await EnsureParentCategoryAsync(request.ParentId, null, cancellationToken);
        var category = new Category { Name = request.Name.Trim(), Description = request.Description, ParentId = request.ParentId, DisplayOrder = request.DisplayOrder };
        dbContext.Categories.Add(category); await auditWriter.WriteAsync("CategoryCreated", nameof(Category), category.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken);
        return ToCategoryDetails(category);
    }

    public async Task<CategoryDetails?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (category is null) return null;
        await EnsureParentCategoryAsync(request.ParentId, id, cancellationToken);
        category.Name = request.Name.Trim(); category.Description = request.Description; category.ParentId = request.ParentId; category.DisplayOrder = request.DisplayOrder;
        await auditWriter.WriteAsync("CategoryUpdated", nameof(Category), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToCategoryDetails(category);
    }

    public async Task<bool> SetCategoryStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (category is null) return false;
        category.IsActive = isActive; await auditWriter.WriteAsync(isActive ? "CategoryActivated" : "CategoryDeactivated", nameof(Category), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<IReadOnlyList<ProductListItem>> GetProductsAsync(CancellationToken cancellationToken) =>
        await dbContext.Products.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).Select(x => new ProductListItem(x.Id, x.Sku, x.Name, x.Description, x.ShortDescription, x.DisplayOrder, x.IsActive)).ToListAsync(cancellationToken);

    public async Task<ProductDetails?> GetProductAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (product is null) return null;
        var categoryIds = await dbContext.ProductCategories.Where(x => x.ProductId == id).Select(x => x.CategoryId).ToListAsync(cancellationToken);
        return ToProductDetails(product, categoryIds);
    }

    public async Task<ProductDetails> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        await ValidateCategoriesAsync(request.CategoryIds, cancellationToken);
        if (await dbContext.Products.AnyAsync(x => x.Sku == request.Sku.Trim(), cancellationToken)) throw new ConflictException("A product with this SKU already exists.");
        var product = new Product { Sku = request.Sku.Trim(), Name = request.Name.Trim(), Description = request.Description, ShortDescription = request.ShortDescription, DisplayOrder = request.DisplayOrder };
        dbContext.Products.Add(product); AddCategoryLinks(product.Id, request.CategoryIds); await auditWriter.WriteAsync("ProductCreated", nameof(Product), product.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToProductDetails(product, request.CategoryIds);
    }

    public async Task<ProductDetails?> UpdateProductAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (product is null) return null;
        await ValidateCategoriesAsync(request.CategoryIds, cancellationToken);
        if (await dbContext.Products.AnyAsync(x => x.Id != id && x.Sku == request.Sku.Trim(), cancellationToken)) throw new ConflictException("A product with this SKU already exists.");
        product.Sku = request.Sku.Trim(); product.Name = request.Name.Trim(); product.Description = request.Description; product.ShortDescription = request.ShortDescription; product.DisplayOrder = request.DisplayOrder;
        await ReplaceCategoriesAsync(id, request.CategoryIds, cancellationToken); await auditWriter.WriteAsync("ProductUpdated", nameof(Product), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToProductDetails(product, request.CategoryIds);
    }

    public async Task<bool> SetProductStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (product is null) return false;
        product.IsActive = isActive; await auditWriter.WriteAsync(isActive ? "ProductActivated" : "ProductDeactivated", nameof(Product), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<ProductDetails?> AssignCategoriesAsync(Guid productId, AssignCategoriesRequest request, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken); if (product is null) return null;
        await ValidateCategoriesAsync(request.CategoryIds, cancellationToken); await ReplaceCategoriesAsync(productId, request.CategoryIds, cancellationToken); await auditWriter.WriteAsync("ProductCategoriesChanged", nameof(Product), productId, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToProductDetails(product, request.CategoryIds);
    }

    public async Task<IReadOnlyList<VariantListItem>> GetVariantsAsync(Guid productId, CancellationToken cancellationToken) =>
        await dbContext.ProductVariants.AsNoTracking().Where(x => x.ProductId == productId && x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).Select(ToVariantList()).ToListAsync(cancellationToken);

    public async Task<VariantDetails> CreateVariantAsync(Guid productId, CreateVariantRequest request, CancellationToken cancellationToken)
    {
        await EnsureProductAsync(productId, cancellationToken); if (await dbContext.ProductVariants.AnyAsync(x => x.ProductId == productId && x.Name == request.Name.Trim(), cancellationToken)) throw new ConflictException("A variant with this name already exists for the product.");
        if (!string.IsNullOrWhiteSpace(request.Sku) && await dbContext.ProductVariants.AnyAsync(x => x.Sku == request.Sku, cancellationToken)) throw new ConflictException("A variant with this SKU already exists.");
        var variant = new ProductVariant { ProductId = productId, Name = request.Name.Trim(), Sku = request.Sku, DefaultPrice = request.Price, DisplayOrder = request.DisplayOrder };
        dbContext.ProductVariants.Add(variant); await auditWriter.WriteAsync("ProductVariantCreated", nameof(ProductVariant), variant.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToVariantDetails(variant);
    }

    public async Task<VariantDetails?> GetVariantAsync(Guid id, CancellationToken cancellationToken) => await dbContext.ProductVariants.AsNoTracking().Where(x => x.Id == id).Select(ToVariantDetails()).FirstOrDefaultAsync(cancellationToken);

    public async Task<VariantDetails?> UpdateVariantAsync(Guid id, UpdateVariantRequest request, CancellationToken cancellationToken)
    {
        var variant = await dbContext.ProductVariants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (variant is null) return null;
        if (await dbContext.ProductVariants.AnyAsync(x => x.Id != id && x.ProductId == variant.ProductId && x.Name == request.Name.Trim(), cancellationToken)) throw new ConflictException("A variant with this name already exists for the product.");
        if (!string.IsNullOrWhiteSpace(request.Sku) && await dbContext.ProductVariants.AnyAsync(x => x.Id != id && x.Sku == request.Sku, cancellationToken)) throw new ConflictException("A variant with this SKU already exists.");
        variant.Name = request.Name.Trim(); variant.Sku = request.Sku; variant.DefaultPrice = request.Price; variant.DisplayOrder = request.DisplayOrder; await auditWriter.WriteAsync("ProductVariantUpdated", nameof(ProductVariant), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToVariantDetails(variant);
    }

    public async Task<bool> SetVariantStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var variant = await dbContext.ProductVariants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (variant is null) return false;
        variant.IsActive = isActive; await auditWriter.WriteAsync(isActive ? "ProductVariantActivated" : "ProductVariantDeactivated", nameof(ProductVariant), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<IReadOnlyList<ProductImageItem>> GetImagesAsync(Guid productId, CancellationToken cancellationToken) => await dbContext.ProductImages.AsNoTracking().Where(x => x.ProductId == productId && x.IsActive).OrderBy(x => x.DisplayOrder).Select(ToImage()).ToListAsync(cancellationToken);

    public async Task<ProductImageItem> CreateImageAsync(Guid productId, CreateProductImageRequest request, CancellationToken cancellationToken)
    {
        await EnsureProductAsync(productId, cancellationToken); if (request.IsPrimary) await ClearPrimaryImageAsync(productId, null, cancellationToken);
        var image = new ProductImage { ProductId = productId, Url = request.Url.Trim(), AltText = request.AltText, DisplayOrder = request.DisplayOrder, IsPrimary = request.IsPrimary };
        dbContext.ProductImages.Add(image); await auditWriter.WriteAsync("ProductImageCreated", nameof(ProductImage), image.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToImage(image);
    }

    public async Task<ProductImageItem?> UpdateImageAsync(Guid id, UpdateProductImageRequest request, CancellationToken cancellationToken)
    {
        var image = await dbContext.ProductImages.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken); if (image is null) return null;
        if (request.IsPrimary) await ClearPrimaryImageAsync(image.ProductId, id, cancellationToken); image.Url = request.Url.Trim(); image.AltText = request.AltText; image.DisplayOrder = request.DisplayOrder; image.IsPrimary = request.IsPrimary; await auditWriter.WriteAsync("ProductImageUpdated", nameof(ProductImage), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return ToImage(image);
    }

    public async Task<bool> DeleteImageAsync(Guid id, CancellationToken cancellationToken)
    {
        var image = await dbContext.ProductImages.FirstOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken); if (image is null) return false; image.IsActive = false; image.IsPrimary = false; await auditWriter.WriteAsync("ProductImageDeactivated", nameof(ProductImage), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<IReadOnlyList<BranchProductItem>> GetBranchProductsAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        return await (from branchProduct in dbContext.BranchProducts.AsNoTracking() join product in dbContext.Products on branchProduct.ProductId equals product.Id where branchProduct.BranchId == branchId && branchProduct.IsActive && product.IsActive orderby product.DisplayOrder, product.Name select new BranchProductItem(branchProduct.Id, branchId, product.Id, product.Name, product.Sku, branchProduct.PriceOverride ?? 0, branchProduct.IsAvailable, branchProduct.IsActive)).ToListAsync(cancellationToken);
    }

    public async Task<BranchProductItem> CreateBranchProductAsync(Guid branchId, CreateBranchProductRequest request, CancellationToken cancellationToken)
    {
        await EnsureActiveBranchAccessAsync(branchId, cancellationToken); await EnsureProductAsync(request.ProductId, cancellationToken);
        if (await dbContext.BranchProducts.AnyAsync(x => x.BranchId == branchId && x.ProductId == request.ProductId, cancellationToken)) throw new ConflictException("This product is already configured for the branch.");
        var branchProduct = new BranchProduct { BranchId = branchId, ProductId = request.ProductId, PriceOverride = request.Price, IsAvailable = request.IsAvailable, IsVisible = true };
        dbContext.BranchProducts.Add(branchProduct); await auditWriter.WriteAsync("BranchProductCreated", nameof(BranchProduct), branchProduct.Id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return await GetBranchProductAsync(branchProduct.Id, cancellationToken) ?? throw new InvalidOperationException("Branch product could not be loaded.");
    }

    public async Task<BranchProductItem?> GetBranchProductAsync(Guid id, CancellationToken cancellationToken)
    {
        var row = await (from branchProduct in dbContext.BranchProducts.AsNoTracking() join product in dbContext.Products on branchProduct.ProductId equals product.Id where branchProduct.Id == id select new { branchProduct, product }).FirstOrDefaultAsync(cancellationToken); if (row is null) return null; await EnsureBranchAccessAsync(row.branchProduct.BranchId, cancellationToken); return new BranchProductItem(row.branchProduct.Id, row.branchProduct.BranchId, row.product.Id, row.product.Name, row.product.Sku, row.branchProduct.PriceOverride ?? 0, row.branchProduct.IsAvailable, row.branchProduct.IsActive);
    }

    public async Task<BranchProductItem?> UpdateBranchProductAsync(Guid id, UpdateBranchProductRequest request, CancellationToken cancellationToken)
    {
        var item = await dbContext.BranchProducts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (item is null) return null; await EnsureActiveBranchAccessAsync(item.BranchId, cancellationToken); item.PriceOverride = request.Price; await auditWriter.WriteAsync("BranchProductUpdated", nameof(BranchProduct), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return await GetBranchProductAsync(id, cancellationToken);
    }

    public async Task<bool> SetBranchProductStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        var item = await dbContext.BranchProducts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (item is null) return false; await EnsureBranchAccessAsync(item.BranchId, cancellationToken); item.IsActive = isActive; await auditWriter.WriteAsync(isActive ? "BranchProductActivated" : "BranchProductDeactivated", nameof(BranchProduct), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<BranchProductItem?> SetBranchProductAvailabilityAsync(Guid id, bool isAvailable, CancellationToken cancellationToken)
    {
        var item = await dbContext.BranchProducts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken); if (item is null) return null; await EnsureBranchAccessAsync(item.BranchId, cancellationToken); item.IsAvailable = isAvailable; await auditWriter.WriteAsync("BranchProductAvailabilityChanged", nameof(BranchProduct), id, currentUser.Username, null, cancellationToken); await dbContext.SaveChangesAsync(cancellationToken); return await GetBranchProductAsync(id, cancellationToken);
    }

    public async Task<MenuResponse> GetMenuAsync(Guid branchId, CancellationToken cancellationToken)
    {
        await EnsureBranchAccessAsync(branchId, cancellationToken);
        var rows = await (from bp in dbContext.BranchProducts.AsNoTracking() join p in dbContext.Products on bp.ProductId equals p.Id join pc in dbContext.ProductCategories on p.Id equals pc.ProductId join c in dbContext.Categories on pc.CategoryId equals c.Id where bp.BranchId == branchId && bp.IsActive && bp.IsAvailable && p.IsActive && c.IsActive orderby c.DisplayOrder, c.Name, p.DisplayOrder, p.Name select new { CategoryId = c.Id, CategoryName = c.Name, CategoryOrder = c.DisplayOrder, ProductId = p.Id, ProductSku = p.Sku, ProductName = p.Name, ProductDescription = p.Description, ProductShortDescription = p.ShortDescription, ProductOrder = p.DisplayOrder, Price = bp.PriceOverride ?? 0 }).ToListAsync(cancellationToken);
        var productIds = rows.Select(x => x.ProductId).Distinct().ToArray();
        var variants = await dbContext.ProductVariants.AsNoTracking().Where(x => productIds.Contains(x.ProductId) && x.IsActive).OrderBy(x => x.DisplayOrder).Select(x => new { x.ProductId, x.Id, x.Name, Price = x.DefaultPrice ?? 0, x.DisplayOrder }).ToListAsync(cancellationToken);
        var modifierRows = await (from assignment in dbContext.ProductModifierGroups.AsNoTracking()
                                  join modifierGroup in dbContext.ModifierGroups.AsNoTracking() on assignment.ModifierGroupId equals modifierGroup.Id
                                  join modifier in dbContext.Modifiers.AsNoTracking() on modifierGroup.Id equals modifier.ModifierGroupId
                                  join option in dbContext.ProductModifierOptions.AsNoTracking() on new { ProductId = assignment.ProductId, ModifierId = modifier.Id } equals new { option.ProductId, option.ModifierId } into options
                                  from option in options.DefaultIfEmpty()
                                  where productIds.Contains(assignment.ProductId) && modifierGroup.IsActive && modifier.IsActive
                                  select new ModifierMenuRow(assignment.ProductId, modifierGroup.Id, modifierGroup.Name, modifierGroup.MinimumSelections, modifierGroup.MaximumSelections, modifierGroup.IsRequired, modifier.Id, modifier.Name, option == null ? modifier.DefaultPrice : option.PriceOverride ?? modifier.DefaultPrice, modifier.DisplayOrder)).ToListAsync(cancellationToken);
        var modifierGroups = modifierRows.GroupBy(x => x.ProductId).ToDictionary(x => x.Key, x => x.GroupBy(y => new { y.GroupId, y.GroupName, y.MinSelections, y.MaxSelections, y.IsRequired }).ToDictionary(y => y.Key.GroupId, y => new MenuModifierGroup(y.Key.GroupId, y.Key.GroupName, y.Key.MinSelections, y.Key.MaxSelections, y.Key.IsRequired, y.OrderBy(z => z.ModifierDisplayOrder).Select(z => new MenuModifier(z.ModifierId, z.ModifierName, z.Price, z.ModifierDisplayOrder)).ToList())));
        var categories = rows.GroupBy(x => new { x.CategoryId, x.CategoryName, x.CategoryOrder }).OrderBy(x => x.Key.CategoryOrder).ThenBy(x => x.Key.CategoryName).Select(category => new MenuCategory(category.Key.CategoryId, category.Key.CategoryName, category.Key.CategoryOrder, category.GroupBy(x => new { x.ProductId, x.ProductSku, x.ProductName, x.ProductDescription, x.ProductShortDescription, x.ProductOrder, x.Price }).OrderBy(x => x.Key.ProductOrder).ThenBy(x => x.Key.ProductName).Select(product => new MenuProduct(product.Key.ProductId, product.Key.ProductSku, product.Key.ProductName, product.Key.ProductDescription, product.Key.ProductShortDescription, product.Key.Price, variants.Where(v => v.ProductId == product.Key.ProductId).Select(v => new MenuVariant(v.Id, v.Name, v.Price, v.DisplayOrder)).ToList(), modifierGroups.TryGetValue(product.Key.ProductId, out var groups) ? groups.Values.OrderBy(x => x.Name).ToList() : [])).ToList())).ToList();
        var combos = await GetActiveMenuCombosAsync(branchId, cancellationToken);
        return new MenuResponse(branchId, categories, combos);
    }

    private async Task<IReadOnlyList<MenuCombo>> GetActiveMenuCombosAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var combos = await dbContext.Combos.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        var activeProductIds = await dbContext.Products.AsNoTracking().Where(x => x.IsActive).Select(x => x.Id).ToListAsync(cancellationToken);
        var activeVariantIds = await dbContext.ProductVariants.AsNoTracking().Where(x => x.IsActive).Select(x => x.Id).ToListAsync(cancellationToken);
        var branchProductIds = await dbContext.BranchProducts.AsNoTracking().Where(x => x.BranchId == branchId && x.IsActive && x.IsAvailable).Select(x => x.ProductId).ToListAsync(cancellationToken);
        return combos.Where(combo => dbContext.ComboItems.Any(item => item.ComboId == combo.Id) && dbContext.ComboItems.Where(item => item.ComboId == combo.Id).All(item => activeProductIds.Contains(item.ProductId) && branchProductIds.Contains(item.ProductId) && (!item.ProductVariantId.HasValue || activeVariantIds.Contains(item.ProductVariantId.Value)))).Select(combo => new MenuCombo(combo.Id, combo.Code, combo.Name, combo.Description, combo.DefaultPrice, combo.DisplayOrder, dbContext.ComboItems.Where(item => item.ComboId == combo.Id).OrderBy(item => item.DisplayOrder).Select(item => new MenuComboItem(item.ProductId, item.ProductVariantId, item.Quantity, item.DisplayOrder)).ToList())).ToList();
    }

    private sealed record ModifierMenuRow(Guid ProductId, Guid GroupId, string GroupName, int MinSelections, int MaxSelections, bool IsRequired, Guid ModifierId, string ModifierName, decimal Price, int ModifierDisplayOrder);

    private async Task EnsureParentCategoryAsync(Guid? parentId, Guid? currentId, CancellationToken cancellationToken) { if (parentId is Guid parent && (currentId == parent || !await dbContext.Categories.AnyAsync(x => x.Id == parent, cancellationToken))) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Parent category does not exist or is invalid."); }
    private async Task ValidateCategoriesAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken) { var unique = ids.Distinct().ToArray(); if (await dbContext.Categories.CountAsync(x => unique.Contains(x.Id) && x.IsActive, cancellationToken) != unique.Length) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("One or more categories do not exist or are inactive."); }
    private void AddCategoryLinks(Guid productId, IEnumerable<Guid> categoryIds) { foreach (var categoryId in categoryIds.Distinct()) dbContext.ProductCategories.Add(new ProductCategory { ProductId = productId, CategoryId = categoryId }); }
    private async Task ReplaceCategoriesAsync(Guid productId, IEnumerable<Guid> categoryIds, CancellationToken cancellationToken) { dbContext.ProductCategories.RemoveRange(await dbContext.ProductCategories.Where(x => x.ProductId == productId).ToListAsync(cancellationToken)); AddCategoryLinks(productId, categoryIds); }
    private async Task EnsureProductAsync(Guid productId, CancellationToken cancellationToken) { if (!await dbContext.Products.AnyAsync(x => x.Id == productId && x.IsActive, cancellationToken)) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Product does not exist or is inactive."); }
    private async Task ClearPrimaryImageAsync(Guid productId, Guid? exceptId, CancellationToken cancellationToken) { var images = await dbContext.ProductImages.Where(x => x.ProductId == productId && x.IsPrimary && x.Id != exceptId).ToListAsync(cancellationToken); foreach (var image in images) image.IsPrimary = false; }
    private async Task EnsureBranchAccessAsync(Guid branchId, CancellationToken cancellationToken) { if (currentUser.IsAdministrator) return; if (currentUser.UserId is not Guid userId || (!await dbContext.UserBranchAccesses.AnyAsync(x => x.UserId == userId && x.BranchId == branchId && x.IsActive, cancellationToken) && !await dbContext.Users.AnyAsync(x => x.Id == userId && x.EmployeeId != null && dbContext.Employees.Any(e => e.Id == x.EmployeeId && e.BranchId == branchId && e.IsActive), cancellationToken))) throw new ForbiddenException("You do not have access to this branch."); }
    private async Task EnsureActiveBranchAccessAsync(Guid branchId, CancellationToken cancellationToken) { await EnsureBranchAccessAsync(branchId, cancellationToken); if (!await dbContext.Branches.AnyAsync(x => x.Id == branchId && x.IsActive, cancellationToken)) throw new RestaurantManagement.Application.Common.Exceptions.ApplicationException("Branch does not exist or is inactive."); }
    private static CategoryDetails ToCategoryDetails(Category x) => new(x.Id, x.Name, x.Description, x.ParentId, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static ProductDetails ToProductDetails(Product x, IEnumerable<Guid> categoryIds) => new(x.Id, x.Sku, x.Name, x.Description, x.ShortDescription, x.DisplayOrder, x.IsActive, categoryIds.Distinct().ToArray(), x.CreatedAt, x.UpdatedAt);
    private static VariantDetails ToVariantDetails(ProductVariant x) => new(x.Id, x.ProductId, x.Name, x.Sku, x.DefaultPrice, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static ProductImageItem ToImage(ProductImage x) => new(x.Id, x.ProductId, x.Url, x.AltText, x.DisplayOrder, x.IsPrimary, x.IsActive);
    private static System.Linq.Expressions.Expression<Func<ProductVariant, VariantListItem>> ToVariantList() => x => new VariantListItem(x.Id, x.ProductId, x.Name, x.Sku, x.DefaultPrice, x.DisplayOrder, x.IsActive);
    private static System.Linq.Expressions.Expression<Func<ProductVariant, VariantDetails>> ToVariantDetails() => x => new VariantDetails(x.Id, x.ProductId, x.Name, x.Sku, x.DefaultPrice, x.DisplayOrder, x.IsActive, x.CreatedAt, x.UpdatedAt);
    private static System.Linq.Expressions.Expression<Func<ProductImage, ProductImageItem>> ToImage() => x => new ProductImageItem(x.Id, x.ProductId, x.Url, x.AltText, x.DisplayOrder, x.IsPrimary, x.IsActive);
}