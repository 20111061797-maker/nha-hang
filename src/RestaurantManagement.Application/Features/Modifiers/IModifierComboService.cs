namespace RestaurantManagement.Application.Features.Modifiers;

public interface IModifierComboService
{
    Task<IReadOnlyList<ModifierGroupItem>> GetModifierGroupsAsync(CancellationToken cancellationToken);
    Task<ModifierGroupDetails?> GetModifierGroupAsync(Guid id, CancellationToken cancellationToken);
    Task<ModifierGroupDetails> CreateModifierGroupAsync(CreateModifierGroupRequest request, CancellationToken cancellationToken);
    Task<ModifierGroupDetails?> UpdateModifierGroupAsync(Guid id, UpdateModifierGroupRequest request, CancellationToken cancellationToken);
    Task<bool> SetModifierGroupStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<IReadOnlyList<ModifierItem>> GetModifiersAsync(Guid groupId, CancellationToken cancellationToken);
    Task<ModifierDetails> CreateModifierAsync(Guid groupId, CreateModifierRequest request, CancellationToken cancellationToken);
    Task<ModifierDetails?> GetModifierAsync(Guid id, CancellationToken cancellationToken);
    Task<ModifierDetails?> UpdateModifierAsync(Guid id, UpdateModifierRequest request, CancellationToken cancellationToken);
    Task<bool> SetModifierStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> GetProductModifierGroupsAsync(Guid productId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> AssignProductModifierGroupsAsync(Guid productId, AssignModifierGroupsRequest request, CancellationToken cancellationToken);
    Task ValidateSelectionsAsync(Guid productId, IReadOnlyList<ModifierSelection> selections, CancellationToken cancellationToken);
    Task<IReadOnlyList<ComboListItem>> GetCombosAsync(CancellationToken cancellationToken);
    Task<ComboDetails?> GetComboAsync(Guid id, CancellationToken cancellationToken);
    Task<ComboDetails> CreateComboAsync(CreateComboRequest request, CancellationToken cancellationToken);
    Task<ComboDetails?> UpdateComboAsync(Guid id, UpdateComboRequest request, CancellationToken cancellationToken);
    Task<bool> SetComboStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<ComboDetails?> ReplaceComboItemsAsync(Guid id, ComboItemUpdateRequest request, CancellationToken cancellationToken);
}