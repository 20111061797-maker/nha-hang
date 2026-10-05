namespace RestaurantManagement.Application.Common.Models;

public sealed record AuthResult(string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt, UserProfileModel User);

public sealed record UserProfileModel(
    Guid Id,
    string Username,
    string Email,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions,
    EmployeeProfileModel? Employee);

public sealed record EmployeeProfileModel(Guid Id, Guid BranchId, string EmployeeCode, string FullName);

public sealed class PasswordPolicyOptions
{
    public const string SectionName = "PasswordPolicy";
    public int MinimumLength { get; init; } = 8;
    public bool RequireUppercase { get; init; } = true;
    public bool RequireLowercase { get; init; } = true;
    public bool RequireDigit { get; init; } = true;
    public bool RequireNonAlphanumeric { get; init; } = true;
}

public static class PermissionCodes
{
    public static readonly string[] All =
    [
        "restaurant.read", "restaurant.update",
        "branch.read", "branch.create", "branch.update", "branch.manage",
        "area.read", "area.create", "area.update", "area.manage",
        "table.read", "table.create", "table.update", "table.manage", "table.change_status",
        "category.read", "category.create", "category.update", "category.manage",
        "product.read", "product.create", "product.update", "product.delete", "product.manage",
        "product.variant.read", "product.variant.create", "product.variant.update", "product.variant.manage",
        "product.image.read", "product.image.create", "product.image.update", "product.image.manage",
        "product.modifier.read", "product.modifier.update", "product.modifier.manage",
        "branch.product.read", "branch.product.create", "branch.product.update", "branch.product.manage",
        "modifier.group.read", "modifier.group.create", "modifier.group.update", "modifier.group.manage",
        "modifier.read", "modifier.create", "modifier.update", "modifier.manage",
        "combo.read", "combo.create", "combo.update", "combo.manage",
        "menu.read",
        "order.read", "order.create", "order.update", "order.cancel", "order.complete", "order.manage",
        "order.add_item", "order.update_item", "order.remove_item", "order.change_status",
        "payment.read", "payment.create", "payment.complete", "payment.cancel", "payment.refund", "payment.manage",
        "kitchen.station.read", "kitchen.station.create", "kitchen.station.update", "kitchen.station.manage",
        "kitchen.order.read", "kitchen.order.update", "kitchen.order.change_status", "kitchen.order.manage",
        "inventory.read", "inventory.adjust",
        "customer.read", "customer.create", "customer.update", "customer.manage",
        "employee.read", "employee.create", "employee.update",
        "report.read",
        "user.read", "user.create", "user.update",
        "role.read", "role.create", "role.update"
    ];
}