using RestaurantManagement.Domain.Common;
using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Domain.Entities;

public sealed class Branch : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class Area : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class DiningTable : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid AreaId { get; set; }
    public string TableNumber { get; set; } = string.Empty;
    public string? Name { get; set; }
    public int Capacity { get; set; }
    public TableStatus Status { get; set; } = TableStatus.Available;
    public string? QrCodeIdentifier { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class TableStatusHistory : BaseEntity
{
    public Guid TableId { get; set; }
    public Guid? ChangedBy { get; set; }
    public TableStatus OldStatus { get; set; }
    public TableStatus NewStatus { get; set; }
    public string? Reason { get; set; }
}

public sealed class User : BaseEntity
{
    public Guid? EmployeeId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }
    public int AccessFailedCount { get; set; }
    public DateTimeOffset? LockoutEndAt { get; set; }
}

public sealed class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid FamilyId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string? ReplacedByTokenHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? RevocationReason { get; set; }
    public string? CreatedByIp { get; set; }
    public string? RevokedByIp { get; set; }
    public string? UserAgent { get; set; }
}

public sealed class PasswordResetToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
}

public sealed class Employee : BaseEntity
{
    public Guid BranchId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public sealed class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public sealed class UserRole
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}

public sealed class UserBranchAccess
{
    public Guid UserId { get; set; }
    public Guid BranchId { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class RolePermission
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
}

public sealed class Category : BaseEntity
{
    public Guid? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Slug { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ProductCategory
{
    public Guid ProductId { get; set; }
    public Guid CategoryId { get; set; }
}

public sealed class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal? DefaultPrice { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ModifierGroup : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ModifierSelectionType SelectionType { get; set; } = ModifierSelectionType.Multiple;
    public bool IsRequired { get; set; }
    public int MinimumSelections { get; set; }
    public int MaximumSelections { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public sealed class Modifier : BaseEntity
{
    public Guid ModifierGroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal DefaultPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public sealed class ProductModifierGroup
{
    public Guid ProductId { get; set; }
    public Guid ModifierGroupId { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class ProductModifierOption : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid ModifierId { get; set; }
    public decimal? PriceOverride { get; set; }
}

public sealed class Combo : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal DefaultPrice { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class ComboItem : BaseEntity
{
    public Guid ComboId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? ProductVariantId { get; set; }
    public int Quantity { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class ProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class BranchProduct : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid ProductId { get; set; }
    public decimal? PriceOverride { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsVisible { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public sealed class Unit : BaseEntity
{
    public Guid? BaseUnitId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; } = 1;
}

public sealed class Ingredient : BaseEntity
{
    public Guid BaseUnitId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class Recipe : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid? ProductVariantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class RecipeVersion : BaseEntity
{
    public Guid RecipeId { get; set; }
    public int VersionNumber { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset EffectiveFrom { get; set; }
    public DateTimeOffset? EffectiveTo { get; set; }
}

public sealed class RecipeItem : BaseEntity
{
    public Guid RecipeVersionId { get; set; }
    public Guid IngredientId { get; set; }
    public Guid UnitId { get; set; }
    public decimal Quantity { get; set; }
    public decimal WastePercentage { get; set; }
}

public sealed class Warehouse : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class InventoryItem : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public Guid IngredientId { get; set; }
    public Guid UnitId { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class InventoryBalance : BaseEntity
{
    public Guid InventoryItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal AverageUnitCost { get; set; }
    public long Version { get; set; }
}

public sealed class InventoryTransaction : BaseEntity
{
    public Guid InventoryItemId { get; set; }
    public Guid? CreatedBy { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public decimal QuantityDelta { get; set; }
    public decimal UnitCost { get; set; }
    public decimal QuantityBefore { get; set; }
    public decimal QuantityAfter { get; set; }
    public InventoryReferenceType ReferenceType { get; set; } = InventoryReferenceType.None;
    public Guid? ReferenceId { get; set; }
    public string? Reason { get; set; }
}

public sealed class StockTransfer : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset TransferredAt { get; set; }
}

public sealed class StockTransferItem : BaseEntity
{
    public Guid StockTransferId { get; set; }
    public Guid InventoryItemId { get; set; }
    public decimal Quantity { get; set; }
}

public sealed class StockCount : BaseEntity
{
    public Guid WarehouseId { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CountedAt { get; set; }
}

public sealed class StockCountItem : BaseEntity
{
    public Guid StockCountId { get; set; }
    public Guid InventoryItemId { get; set; }
    public decimal ExpectedQuantity { get; set; }
    public decimal ActualQuantity { get; set; }
}

public sealed class Supplier : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class PurchaseOrder : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid SupplierId { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset OrderedAt { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public decimal TotalAmount { get; set; }
}

public sealed class PurchaseOrderItem : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public Guid IngredientId { get; set; }
    public Guid UnitId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
}

public sealed class GoodsReceipt : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public Guid ReceivedBy { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
}

public sealed class GoodsReceiptItem : BaseEntity
{
    public Guid GoodsReceiptId { get; set; }
    public Guid IngredientId { get; set; }
    public Guid UnitId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
}

public sealed class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid? DiningTableId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? ParentOrderId { get; set; }
    public OrderType OrderType { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Draft;
    public string? CustomerNameSnapshot { get; set; }
    public string? CustomerPhoneSnapshot { get; set; }
    public string? DeliveryAddressSnapshot { get; set; }
    public string? EmployeeNameSnapshot { get; set; }
    public string CurrencyCode { get; set; } = "VND";
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceChargeAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public long Version { get; set; } = 1;
}

public sealed class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? ProductVariantId { get; set; }
    public Guid? ComboId { get; set; }
    public Guid? RecipeVersionId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string? VariantNameSnapshot { get; set; }
    public string? ComboNameSnapshot { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public string? Notes { get; set; }
}

public sealed class OrderItemModifier : BaseEntity
{
    public Guid OrderItemId { get; set; }
    public Guid ModifierId { get; set; }
    public string ModifierNameSnapshot { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public sealed class OrderStatusHistory : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid? ChangedBy { get; set; }
    public OrderStatus OldStatus { get; set; }
    public OrderStatus NewStatus { get; set; }
    public string? Note { get; set; }
}

public sealed class OrderTableAllocation : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid TableId { get; set; }
    public TableAllocationType AllocationType { get; set; } = TableAllocationType.Primary;
    public DateTimeOffset AllocatedAt { get; set; }
    public DateTimeOffset? ReleasedAt { get; set; }
}

public sealed class Payment : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid BranchId { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public Guid? CreatedBy { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public decimal? TenderedAmount { get; set; }
    public decimal? ChangeAmount { get; set; }
    public string CurrencyCode { get; set; } = "VND";
    public string? TransactionReference { get; set; }
    public string? Provider { get; set; }
    public string? ProviderTransactionId { get; set; }
    public string? Note { get; set; }
    public string? IdempotencyKey { get; set; }
    public DateTimeOffset PaymentDate { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public long Version { get; set; } = 1;
}

public sealed class PaymentAllocation : BaseEntity
{
    public Guid PaymentId { get; set; }
    public Guid OrderId { get; set; }
    public decimal Amount { get; set; }
}

public sealed class PaymentRefund : BaseEntity
{
    public Guid PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; } = PaymentStatus.Completed;
    public string? RefundReference { get; set; }
    public string? ProviderRefundId { get; set; }
    public Guid? CreatedBy { get; set; }
}

public sealed class Customer : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class CustomerAddress : BaseEntity
{
    public Guid CustomerId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? Ward { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }
    public bool IsDefault { get; set; }
}

public sealed class CustomerMembershipLevel : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MinimumPoints { get; set; }
}

public sealed class CustomerLoyaltyAccount : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid MembershipLevelId { get; set; }
    public int Balance { get; set; }
}

public sealed class CustomerPointTransaction : BaseEntity
{
    public Guid LoyaltyAccountId { get; set; }
    public Guid? OrderId { get; set; }
    public int PointsDelta { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public sealed class Promotion : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public PromotionType Type { get; set; }
    public decimal? Percentage { get; set; }
    public decimal? FixedAmount { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public int? UsageLimit { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class PromotionBranch
{
    public Guid PromotionId { get; set; }
    public Guid BranchId { get; set; }
}

public sealed class PromotionProduct
{
    public Guid PromotionId { get; set; }
    public Guid ProductId { get; set; }
}

public sealed class PromotionCategory
{
    public Guid PromotionId { get; set; }
    public Guid CategoryId { get; set; }
}

public sealed class PromotionBuyGetRule : BaseEntity
{
    public Guid PromotionId { get; set; }
    public Guid BuyProductId { get; set; }
    public int BuyQuantity { get; set; }
    public Guid GetProductId { get; set; }
    public int GetQuantity { get; set; }
}

public sealed class Voucher : BaseEntity
{
    public Guid PromotionId { get; set; }
    public string Code { get; set; } = string.Empty;
    public int? UsageLimit { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class VoucherRedemption : BaseEntity
{
    public Guid VoucherId { get; set; }
    public Guid OrderId { get; set; }
    public Guid? CustomerId { get; set; }
    public decimal DiscountAmount { get; set; }
}

public sealed class KitchenOrder : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid BranchId { get; set; }
    public Guid KitchenStationId { get; set; }
    public string OrderNumberSnapshot { get; set; } = string.Empty;
    public OrderType OrderTypeSnapshot { get; set; }
    public string? TableNumberSnapshot { get; set; }
    public KitchenOrderStatus Status { get; set; } = KitchenOrderStatus.New;
    public KitchenPriority Priority { get; set; } = KitchenPriority.Normal;
    public string? Note { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? ReadyAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public long Version { get; set; } = 1;
}

public sealed class KitchenStation : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class KitchenStationProduct : BaseEntity
{
    public Guid KitchenStationId { get; set; }
    public Guid ProductId { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class KitchenOrderItem : BaseEntity
{
    public Guid KitchenOrderId { get; set; }
    public Guid OrderItemId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? ProductVariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public string? VariantNameSnapshot { get; set; }
    public decimal Quantity { get; set; }
    public string? NotesSnapshot { get; set; }
    public string? ModifierNamesSnapshot { get; set; }
    public KitchenOrderStatus Status { get; set; } = KitchenOrderStatus.New;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? ReadyAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public sealed class DeliveryDriver : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid EmployeeId { get; set; }
    public bool IsAvailable { get; set; } = true;
}

public sealed class DeliveryOrder : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid? DeliveryDriverId { get; set; }
    public DeliveryStatus Status { get; set; } = DeliveryStatus.Pending;
    public decimal DeliveryFee { get; set; }
}

public sealed class DeliveryAddress : BaseEntity
{
    public Guid DeliveryOrderId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? District { get; set; }
    public string? City { get; set; }
}

public sealed class Shift : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid OpenedBy { get; set; }
    public ShiftStatus Status { get; set; } = ShiftStatus.Open;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public decimal OpeningCashAmount { get; set; }
    public decimal? ClosingCashAmount { get; set; }
    public decimal? CashDifference { get; set; }
}

public sealed class EmployeeShift
{
    public Guid ShiftId { get; set; }
    public Guid EmployeeId { get; set; }
}

public sealed class ExpenseCategory : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class Expense : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid ExpenseCategoryId { get; set; }
    public Guid? CreatedBy { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset ExpenseDate { get; set; }
}

public sealed class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? ActorNameSnapshot { get; set; }
    public string? IpAddress { get; set; }
    public string? MetadataJson { get; set; }
}

public sealed class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? BranchId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}