using FluentValidation;

namespace RestaurantManagement.Application.Features.Branches;

public sealed class CreateBranchValidator : AbstractValidator<CreateBranchRequest>
{
    public CreateBranchValidator() { RuleFor(x => x.Code).NotEmpty().MaximumLength(50); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)); }
}

public sealed class UpdateBranchValidator : AbstractValidator<UpdateBranchRequest>
{
    public UpdateBranchValidator() { RuleFor(x => x.Code).NotEmpty().MaximumLength(50); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)); }
}

public sealed class CreateAreaValidator : AbstractValidator<CreateAreaRequest>
{
    public CreateAreaValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}

public sealed class UpdateAreaValidator : AbstractValidator<UpdateAreaRequest>
{
    public UpdateAreaValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}

public sealed class CreateTableValidator : AbstractValidator<CreateTableRequest>
{
    public CreateTableValidator() { RuleFor(x => x.TableNumber).NotEmpty().MaximumLength(50); RuleFor(x => x.AreaId).NotEmpty(); RuleFor(x => x.Capacity).GreaterThan(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}

public sealed class UpdateTableValidator : AbstractValidator<UpdateTableRequest>
{
    public UpdateTableValidator() { RuleFor(x => x.TableNumber).NotEmpty().MaximumLength(50); RuleFor(x => x.AreaId).NotEmpty(); RuleFor(x => x.Capacity).GreaterThan(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}

public sealed class ChangeTableStatusValidator : AbstractValidator<ChangeTableStatusRequest>
{
    public ChangeTableStatusValidator() { RuleFor(x => x.Status).IsInEnum(); }
}