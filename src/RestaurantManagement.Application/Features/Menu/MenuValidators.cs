using FluentValidation;

namespace RestaurantManagement.Application.Features.Menu;

public sealed class CreateCategoryValidator : AbstractValidator<CreateCategoryRequest>
{
    public CreateCategoryValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateCategoryValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductValidator() { RuleFor(x => x.Sku).NotEmpty().MaximumLength(100); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateProductValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductValidator() { RuleFor(x => x.Sku).NotEmpty().MaximumLength(100); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class CreateVariantValidator : AbstractValidator<CreateVariantRequest>
{
    public CreateVariantValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0).When(x => x.Price.HasValue); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateVariantValidator : AbstractValidator<UpdateVariantRequest>
{
    public UpdateVariantValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0).When(x => x.Price.HasValue); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class CreateBranchProductValidator : AbstractValidator<CreateBranchProductRequest>
{
    public CreateBranchProductValidator() { RuleFor(x => x.ProductId).NotEmpty(); RuleFor(x => x.Price).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateBranchProductValidator : AbstractValidator<UpdateBranchProductRequest>
{
    public UpdateBranchProductValidator() { RuleFor(x => x.Price).GreaterThanOrEqualTo(0); }
}
public sealed class CreateProductImageValidator : AbstractValidator<CreateProductImageRequest>
{
    public CreateProductImageValidator() { RuleFor(x => x.Url).NotEmpty().MaximumLength(2000); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateProductImageValidator : AbstractValidator<UpdateProductImageRequest>
{
    public UpdateProductImageValidator() { RuleFor(x => x.Url).NotEmpty().MaximumLength(2000); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}