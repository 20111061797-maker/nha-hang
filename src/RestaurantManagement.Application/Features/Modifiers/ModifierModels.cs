using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Application.Features.Modifiers;

public sealed record ModifierGroupItem(Guid Id, string Name, string? Description, ModifierSelectionType SelectionType, int MinSelections, int MaxSelections, bool IsRequired, int DisplayOrder, bool IsActive);
public sealed record ModifierGroupDetails(Guid Id, string Name, string? Description, ModifierSelectionType SelectionType, int MinSelections, int MaxSelections, bool IsRequired, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateModifierGroupRequest(string Name, string? Description, ModifierSelectionType SelectionType, int MinSelections, int MaxSelections, bool IsRequired, int DisplayOrder);
public sealed record UpdateModifierGroupRequest(string Name, string? Description, ModifierSelectionType SelectionType, int MinSelections, int MaxSelections, bool IsRequired, int DisplayOrder);
public sealed record ModifierItem(Guid Id, Guid ModifierGroupId, string Name, string? Description, decimal Price, int DisplayOrder, bool IsActive);
public sealed record ModifierDetails(Guid Id, Guid ModifierGroupId, string Name, string? Description, decimal Price, int DisplayOrder, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateModifierRequest(string Name, string? Description, decimal Price, int DisplayOrder);
public sealed record UpdateModifierRequest(string Name, string? Description, decimal Price, int DisplayOrder);
public sealed record AssignModifierGroupsRequest(IReadOnlyList<Guid> ModifierGroupIds);
public sealed record ModifierSelection(Guid ModifierGroupId, IReadOnlyList<Guid> ModifierIds);

public sealed record ComboItemRequest(Guid ProductId, Guid? ProductVariantId, int Quantity, int DisplayOrder);
public sealed record ComboItemModel(Guid Id, Guid ComboId, Guid ProductId, Guid? ProductVariantId, int Quantity, int DisplayOrder);
public sealed record ComboItemUpdateRequest(IReadOnlyList<ComboItemRequest> Items);
public sealed record ComboListItem(Guid Id, string Code, string Name, string? Description, decimal Price, int DisplayOrder, bool IsActive);
public sealed record ComboDetails(Guid Id, string Code, string Name, string? Description, decimal Price, int DisplayOrder, bool IsActive, IReadOnlyList<ComboItemModel> Items, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CreateComboRequest(string Code, string Name, string? Description, decimal Price, int DisplayOrder, IReadOnlyList<ComboItemRequest> Items);
public sealed record UpdateComboRequest(string Code, string Name, string? Description, decimal Price, int DisplayOrder, IReadOnlyList<ComboItemRequest> Items);