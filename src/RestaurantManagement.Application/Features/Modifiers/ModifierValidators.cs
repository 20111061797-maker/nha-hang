using FluentValidation;

namespace RestaurantManagement.Application.Features.Modifiers;

public sealed class ModifierGroupValidator<T> : AbstractValidator<T> where T : class
{
    public ModifierGroupValidator()
    {
        RuleFor(x => GetName(x)).NotEmpty().MaximumLength(200);
    }

    private static string GetName(T value) => value switch { CreateModifierGroupRequest create => create.Name, UpdateModifierGroupRequest update => update.Name, _ => string.Empty };
}

public sealed class CreateModifierGroupValidator : AbstractValidator<CreateModifierGroupRequest>
{
    public CreateModifierGroupValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.MinSelections).GreaterThanOrEqualTo(0); RuleFor(x => x.MaxSelections).GreaterThanOrEqualTo(x => x.MinSelections); RuleFor(x => x).Must(x => !x.IsRequired || x.MinSelections >= 1).WithMessage("Required groups must require at least one selection."); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateModifierGroupValidator : AbstractValidator<UpdateModifierGroupRequest>
{
    public UpdateModifierGroupValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.MinSelections).GreaterThanOrEqualTo(0); RuleFor(x => x.MaxSelections).GreaterThanOrEqualTo(x => x.MinSelections); RuleFor(x => x).Must(x => !x.IsRequired || x.MinSelections >= 1).WithMessage("Required groups must require at least one selection."); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class CreateModifierValidator : AbstractValidator<CreateModifierRequest>
{
    public CreateModifierValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class UpdateModifierValidator : AbstractValidator<UpdateModifierRequest>
{
    public UpdateModifierValidator() { RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}
public sealed class CreateComboValidator : AbstractValidator<CreateComboRequest>
{
    public CreateComboValidator() { RuleFor(x => x.Code).NotEmpty().MaximumLength(100); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); RuleForEach(x => x.Items).SetValidator(new ComboItemValidator()); }
}
public sealed class UpdateComboValidator : AbstractValidator<UpdateComboRequest>
{
    public UpdateComboValidator() { RuleFor(x => x.Code).NotEmpty().MaximumLength(100); RuleFor(x => x.Name).NotEmpty().MaximumLength(200); RuleFor(x => x.Price).GreaterThanOrEqualTo(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); RuleForEach(x => x.Items).SetValidator(new ComboItemValidator()); }
}
public sealed class ComboItemValidator : AbstractValidator<ComboItemRequest>
{
    public ComboItemValidator() { RuleFor(x => x.ProductId).NotEmpty(); RuleFor(x => x.Quantity).GreaterThan(0); RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0); }
}