using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;

namespace RestaurantManagement.Infrastructure.Persistence.Configurations;

public static class RestaurantModelConfigurations
{
    public static void ApplyRestaurantConfigurations(this ModelBuilder modelBuilder)
    {
        ConfigureKeys(modelBuilder);
        ConfigureRelationships(modelBuilder);
        ConfigureIndexes(modelBuilder);
        ConfigureProperties(modelBuilder);
        ConfigureConstraints(modelBuilder);
        ConfigureSeedData(modelBuilder);
    }

    private static void ConfigureKeys(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        modelBuilder.Entity<RolePermission>().HasKey(x => new { x.RoleId, x.PermissionId });
        modelBuilder.Entity<UserBranchAccess>().HasKey(x => new { x.UserId, x.BranchId });
        modelBuilder.Entity<EmployeeShift>().HasKey(x => new { x.ShiftId, x.EmployeeId });
        modelBuilder.Entity<ProductCategory>().HasKey(x => new { x.ProductId, x.CategoryId });
        modelBuilder.Entity<ProductModifierGroup>().HasKey(x => new { x.ProductId, x.ModifierGroupId });
        modelBuilder.Entity<PromotionBranch>().HasKey(x => new { x.PromotionId, x.BranchId });
        modelBuilder.Entity<PromotionProduct>().HasKey(x => new { x.PromotionId, x.ProductId });
        modelBuilder.Entity<PromotionCategory>().HasKey(x => new { x.PromotionId, x.CategoryId });
        modelBuilder.Entity<ComboItem>().HasIndex(x => new { x.ComboId, x.ProductId, x.ProductVariantId }).IsUnique();
    }

    private static void ConfigureRelationships(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Area>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DiningTable>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DiningTable>().HasOne<Area>().WithMany().HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TableStatusHistory>().HasOne<DiningTable>().WithMany().HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Employee>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<User>().HasOne<Employee>().WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<UserBranchAccess>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserBranchAccess>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RefreshToken>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PasswordResetToken>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductCategory>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductCategory>().HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductVariant>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Modifier>().HasOne<ModifierGroup>().WithMany().HasForeignKey(x => x.ModifierGroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProductModifierGroup>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductModifierGroup>().HasOne<ModifierGroup>().WithMany().HasForeignKey(x => x.ModifierGroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProductModifierOption>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProductModifierOption>().HasOne<Modifier>().WithMany().HasForeignKey(x => x.ModifierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ComboItem>().HasOne<Combo>().WithMany().HasForeignKey(x => x.ComboId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ComboItem>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ProductImage>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BranchProduct>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<BranchProduct>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Ingredient>().HasOne<Unit>().WithMany().HasForeignKey(x => x.BaseUnitId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Recipe>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RecipeVersion>().HasOne<Recipe>().WithMany().HasForeignKey(x => x.RecipeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RecipeItem>().HasOne<RecipeVersion>().WithMany().HasForeignKey(x => x.RecipeVersionId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RecipeItem>().HasOne<Ingredient>().WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RecipeItem>().HasOne<Unit>().WithMany().HasForeignKey(x => x.UnitId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Warehouse>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryItem>().HasOne<Warehouse>().WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryItem>().HasOne<Ingredient>().WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InventoryBalance>().HasOne<InventoryItem>().WithMany().HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<InventoryTransaction>().HasOne<InventoryItem>().WithMany().HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockTransferItem>().HasOne<StockTransfer>().WithMany().HasForeignKey(x => x.StockTransferId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StockTransferItem>().HasOne<InventoryItem>().WithMany().HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockCountItem>().HasOne<StockCount>().WithMany().HasForeignKey(x => x.StockCountId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StockCountItem>().HasOne<InventoryItem>().WithMany().HasForeignKey(x => x.InventoryItemId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PurchaseOrder>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PurchaseOrder>().HasOne<Supplier>().WithMany().HasForeignKey(x => x.SupplierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PurchaseOrderItem>().HasOne<PurchaseOrder>().WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PurchaseOrderItem>().HasOne<Ingredient>().WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GoodsReceipt>().HasOne<PurchaseOrder>().WithMany().HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GoodsReceipt>().HasOne<Warehouse>().WithMany().HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GoodsReceiptItem>().HasOne<GoodsReceipt>().WithMany().HasForeignKey(x => x.GoodsReceiptId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GoodsReceiptItem>().HasOne<Ingredient>().WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Order>().HasOne<DiningTable>().WithMany().HasForeignKey(x => x.DiningTableId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Order>().HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<OrderItem>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrderItem>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<OrderItem>().HasOne<Combo>().WithMany().HasForeignKey(x => x.ComboId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<OrderItemModifier>().HasOne<OrderItem>().WithMany().HasForeignKey(x => x.OrderItemId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrderItemModifier>().HasOne<Modifier>().WithMany().HasForeignKey(x => x.ModifierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<OrderStatusHistory>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrderTableAllocation>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrderTableAllocation>().HasOne<DiningTable>().WithMany().HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payment>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payment>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentAllocation>().HasOne<Payment>().WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentAllocation>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PaymentRefund>().HasOne<Payment>().WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CustomerAddress>().HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CustomerLoyaltyAccount>().HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CustomerLoyaltyAccount>().HasOne<CustomerMembershipLevel>().WithMany().HasForeignKey(x => x.MembershipLevelId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CustomerPointTransaction>().HasOne<CustomerLoyaltyAccount>().WithMany().HasForeignKey(x => x.LoyaltyAccountId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Voucher>().HasOne<Promotion>().WithMany().HasForeignKey(x => x.PromotionId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<VoucherRedemption>().HasOne<Voucher>().WithMany().HasForeignKey(x => x.VoucherId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<VoucherRedemption>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<KitchenStation>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenStationProduct>().HasOne<KitchenStation>().WithMany().HasForeignKey(x => x.KitchenStationId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenStationProduct>().HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenOrder>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenOrder>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenOrder>().HasOne<KitchenStation>().WithMany().HasForeignKey(x => x.KitchenStationId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<KitchenOrderItem>().HasOne<KitchenOrder>().WithMany().HasForeignKey(x => x.KitchenOrderId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<KitchenOrderItem>().HasOne<OrderItem>().WithMany().HasForeignKey(x => x.OrderItemId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DeliveryDriver>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DeliveryDriver>().HasOne<Employee>().WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DeliveryOrder>().HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<DeliveryOrder>().HasOne<DeliveryDriver>().WithMany().HasForeignKey(x => x.DeliveryDriverId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<DeliveryAddress>().HasOne<DeliveryOrder>().WithMany().HasForeignKey(x => x.DeliveryOrderId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Shift>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<EmployeeShift>().HasOne<Shift>().WithMany().HasForeignKey(x => x.ShiftId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<EmployeeShift>().HasOne<Employee>().WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Expense>().HasOne<Branch>().WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Expense>().HasOne<ExpenseCategory>().WithMany().HasForeignKey(x => x.ExpenseCategoryId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Notification>().HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureIndexes(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Area>().HasIndex(x => new { x.BranchId, x.Name }).IsUnique();
        modelBuilder.Entity<Area>().HasIndex(x => new { x.BranchId, x.IsActive });
        modelBuilder.Entity<DiningTable>().HasIndex(x => new { x.BranchId, x.TableNumber }).IsUnique();
        modelBuilder.Entity<DiningTable>().HasIndex(x => new { x.BranchId, x.IsActive });
        modelBuilder.Entity<DiningTable>().HasIndex(x => new { x.AreaId, x.IsActive });
        modelBuilder.Entity<DiningTable>().HasIndex(x => x.QrCodeIdentifier).IsUnique();
        modelBuilder.Entity<TableStatusHistory>().HasIndex(x => new { x.TableId, x.CreatedAt });
        modelBuilder.Entity<User>().HasIndex(x => x.Username).IsUnique();
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(x => new { x.UserId, x.ExpiresAt });
        modelBuilder.Entity<RefreshToken>().HasIndex(x => new { x.FamilyId, x.RevokedAt });
        modelBuilder.Entity<PasswordResetToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<Employee>().HasIndex(x => new { x.BranchId, x.EmployeeCode }).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => x.Sku).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => x.IsActive);
        modelBuilder.Entity<Category>().HasIndex(x => new { x.IsActive, x.DisplayOrder });
        modelBuilder.Entity<ProductCategory>().HasIndex(x => new { x.CategoryId, x.ProductId });
        modelBuilder.Entity<ProductVariant>().HasIndex(x => new { x.ProductId, x.Name }).IsUnique();
        modelBuilder.Entity<ProductVariant>().HasIndex(x => new { x.ProductId, x.IsActive });
        modelBuilder.Entity<ProductVariant>().HasIndex(x => x.Sku).IsUnique();
        modelBuilder.Entity<BranchProduct>().HasIndex(x => new { x.BranchId, x.ProductId }).IsUnique();
        modelBuilder.Entity<BranchProduct>().HasIndex(x => new { x.BranchId, x.IsActive });
        modelBuilder.Entity<BranchProduct>().HasIndex(x => x.ProductId);
        modelBuilder.Entity<BranchProduct>().HasIndex(x => x.IsAvailable);
        modelBuilder.Entity<ModifierGroup>().HasIndex(x => new { x.IsActive, x.DisplayOrder });
        modelBuilder.Entity<Modifier>().HasIndex(x => new { x.ModifierGroupId, x.IsActive, x.DisplayOrder });
        modelBuilder.Entity<ProductModifierGroup>().HasIndex(x => x.ProductId);
        modelBuilder.Entity<ProductModifierGroup>().HasIndex(x => x.ModifierGroupId);
        modelBuilder.Entity<ProductModifierOption>().HasIndex(x => new { x.ProductId, x.ModifierId }).IsUnique();
        modelBuilder.Entity<Combo>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Combo>().HasIndex(x => new { x.IsActive, x.DisplayOrder });
        modelBuilder.Entity<ComboItem>().HasIndex(x => new { x.ComboId, x.DisplayOrder });
        modelBuilder.Entity<ComboItem>().HasIndex(x => x.ProductId);
        modelBuilder.Entity<Ingredient>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Warehouse>().HasIndex(x => new { x.BranchId, x.Name }).IsUnique();
        modelBuilder.Entity<InventoryItem>().HasIndex(x => new { x.WarehouseId, x.IngredientId }).IsUnique();
        modelBuilder.Entity<InventoryBalance>().HasIndex(x => x.InventoryItemId).IsUnique();
        modelBuilder.Entity<InventoryTransaction>().HasIndex(x => new { x.InventoryItemId, x.CreatedAt });
        modelBuilder.Entity<Order>().HasIndex(x => new { x.BranchId, x.Status, x.CreatedAt });
        modelBuilder.Entity<Order>().HasIndex(x => x.OrderNumber).IsUnique();
        modelBuilder.Entity<Order>().HasIndex(x => new { x.DiningTableId, x.Status });
        modelBuilder.Entity<Order>().HasIndex(x => new { x.CustomerId, x.CreatedAt });
        modelBuilder.Entity<OrderItem>().HasIndex(x => x.OrderId);
        modelBuilder.Entity<Payment>().HasIndex(x => new { x.OrderId, x.Status });
        modelBuilder.Entity<Payment>().HasIndex(x => x.PaymentNumber).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(x => new { x.BranchId, x.PaymentDate });
        modelBuilder.Entity<Payment>().HasIndex(x => x.TransactionReference);
        modelBuilder.Entity<Payment>().HasIndex(x => x.ProviderTransactionId);
        modelBuilder.Entity<Payment>().HasIndex(x => new { x.OrderId, x.IdempotencyKey }).IsUnique();
        modelBuilder.Entity<PaymentRefund>().HasIndex(x => new { x.PaymentId, x.CreatedAt });
        modelBuilder.Entity<Customer>().HasIndex(x => x.Phone).IsUnique();
        modelBuilder.Entity<Voucher>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<KitchenOrder>().HasIndex(x => new { x.KitchenStationId, x.Status, x.CreatedAt });
        modelBuilder.Entity<DeliveryOrder>().HasIndex(x => new { x.Status, x.CreatedAt });
        modelBuilder.Entity<OrderStatusHistory>().HasIndex(x => new { x.OrderId, x.CreatedAt });
        modelBuilder.Entity<AuditLog>().HasIndex(x => new { x.EntityType, x.EntityId, x.CreatedAt });
        modelBuilder.Entity<Notification>().HasIndex(x => new { x.UserId, x.IsRead });
        modelBuilder.Entity<KitchenStation>().HasIndex(x => new { x.BranchId, x.Code }).IsUnique();
        modelBuilder.Entity<KitchenStation>().HasIndex(x => new { x.BranchId, x.IsActive, x.DisplayOrder });
        modelBuilder.Entity<KitchenStationProduct>().HasIndex(x => new { x.KitchenStationId, x.ProductId }).IsUnique();
        modelBuilder.Entity<KitchenOrder>().HasIndex(x => new { x.OrderId, x.KitchenStationId }).IsUnique();
        modelBuilder.Entity<KitchenOrder>().HasIndex(x => new { x.BranchId, x.Status, x.CreatedAt });
        modelBuilder.Entity<KitchenOrderItem>().HasIndex(x => new { x.KitchenOrderId, x.Status });
    }

    private static void ConfigureProperties(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                {
                    property.SetPrecision(19);
                    property.SetScale(4);
                }

                if (property.ClrType.IsEnum)
                {
                    var converterType = typeof(Microsoft.EntityFrameworkCore.Storage.ValueConversion.EnumToStringConverter<>).MakeGenericType(property.ClrType);
                    var converter = Activator.CreateInstance(converterType);
                    property.SetValueConverter((Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter)converter!);
                }
            }
        }

        modelBuilder.Entity<InventoryBalance>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<Order>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<Payment>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<KitchenOrder>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<AuditLog>().Property(x => x.MetadataJson).HasColumnType("jsonb");
    }

    private static void ConfigureConstraints(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>().ToTable("branches", table => table.HasCheckConstraint("ck_branches_code_not_empty", "length(trim(code)) > 0"));
        modelBuilder.Entity<Area>().ToTable("areas", table => table.HasCheckConstraint("ck_areas_name_not_empty", "length(trim(name)) > 0"));
        modelBuilder.Entity<DiningTable>().ToTable("dining_tables", table => table.HasCheckConstraint("ck_dining_tables_capacity_positive", "capacity > 0"));
        modelBuilder.Entity<RecipeItem>().ToTable("recipe_items", table => table.HasCheckConstraint("ck_recipe_items_quantity_positive", "quantity > 0"));
        modelBuilder.Entity<InventoryBalance>().ToTable("inventory_balances", table => table.HasCheckConstraint("ck_inventory_balances_quantity_non_negative", "quantity >= 0"));
        modelBuilder.Entity<Payment>().ToTable("payments", table => table.HasCheckConstraint("ck_payments_amount_positive", "amount > 0"));
        modelBuilder.Entity<PaymentAllocation>().ToTable("payment_allocations", table => table.HasCheckConstraint("ck_payment_allocations_amount_positive", "amount > 0"));
        modelBuilder.Entity<PaymentRefund>().ToTable("payment_refunds", table => table.HasCheckConstraint("ck_payment_refunds_amount_positive", "amount > 0"));
        modelBuilder.Entity<Promotion>().ToTable("promotions", table => table.HasCheckConstraint("ck_promotions_dates_valid", "ends_at IS NULL OR starts_at < ends_at"));
        modelBuilder.Entity<Order>().ToTable("orders", table => table.HasCheckConstraint("ck_orders_amounts_non_negative", "subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0"));
        modelBuilder.Entity<OrderItem>().ToTable("order_items", table => table.HasCheckConstraint("ck_order_items_line_values_valid", "quantity > 0 AND unit_price >= 0 AND line_total >= 0"));
        modelBuilder.Entity<OrderItemModifier>().ToTable("order_item_modifiers", table => table.HasCheckConstraint("ck_order_item_modifiers_values_valid", "quantity > 0 AND unit_price >= 0 AND total_price >= 0"));
        modelBuilder.Entity<ModifierGroup>().ToTable("modifier_groups", table => table.HasCheckConstraint("ck_modifier_groups_selection_range", "minimum_selections >= 0 AND maximum_selections >= minimum_selections"));
        modelBuilder.Entity<Modifier>().ToTable("modifiers", table => table.HasCheckConstraint("ck_modifiers_default_price_non_negative", "default_price >= 0"));
        modelBuilder.Entity<Combo>().ToTable("combos", table => table.HasCheckConstraint("ck_combos_default_price_non_negative", "default_price >= 0"));
        modelBuilder.Entity<ComboItem>().ToTable("combo_items", table => table.HasCheckConstraint("ck_combo_items_quantity_positive", "quantity > 0"));
        modelBuilder.Entity<ProductVariant>().ToTable("product_variants", table => table.HasCheckConstraint("ck_product_variants_default_price_non_negative", "default_price IS NULL OR default_price >= 0"));
        modelBuilder.Entity<BranchProduct>().ToTable("branch_products", table => table.HasCheckConstraint("ck_branch_products_price_non_negative", "price_override IS NULL OR price_override >= 0"));
        modelBuilder.Entity<KitchenStationProduct>().ToTable("kitchen_station_products");
        modelBuilder.Entity<KitchenOrder>().ToTable("kitchen_orders");
        modelBuilder.Entity<KitchenOrderItem>().ToTable("kitchen_order_items", table => table.HasCheckConstraint("ck_kitchen_order_items_quantity_positive", "quantity > 0"));
    }

    private static void ConfigureSeedData(ModelBuilder modelBuilder)
    {
        var adminRoleId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var managerRoleId = Guid.Parse("00000000-0000-0000-0000-000000000002");
        var readDashboardPermissionId = Guid.Parse("00000000-0000-0000-0000-000000000101");
        var manageMenuPermissionId = Guid.Parse("00000000-0000-0000-0000-000000000102");
        var manageOrdersPermissionId = Guid.Parse("00000000-0000-0000-0000-000000000103");

        modelBuilder.Entity<Role>().HasData(
            new { Id = adminRoleId, Name = "Admin", Description = "System administrator", CreatedAt = DateTimeOffset.UnixEpoch, UpdatedAt = DateTimeOffset.UnixEpoch },
            new { Id = managerRoleId, Name = "Manager", Description = "Restaurant manager", CreatedAt = DateTimeOffset.UnixEpoch, UpdatedAt = DateTimeOffset.UnixEpoch });

        modelBuilder.Entity<Permission>().HasData(
            new { Id = readDashboardPermissionId, Code = "dashboard.read", Description = "View dashboard", CreatedAt = DateTimeOffset.UnixEpoch, UpdatedAt = DateTimeOffset.UnixEpoch },
            new { Id = manageMenuPermissionId, Code = "menu.manage", Description = "Manage menu", CreatedAt = DateTimeOffset.UnixEpoch, UpdatedAt = DateTimeOffset.UnixEpoch },
            new { Id = manageOrdersPermissionId, Code = "orders.manage", Description = "Manage orders", CreatedAt = DateTimeOffset.UnixEpoch, UpdatedAt = DateTimeOffset.UnixEpoch });

        modelBuilder.Entity<RolePermission>().HasData(
            new { RoleId = adminRoleId, PermissionId = readDashboardPermissionId },
            new { RoleId = adminRoleId, PermissionId = manageMenuPermissionId },
            new { RoleId = adminRoleId, PermissionId = manageOrdersPermissionId },
            new { RoleId = managerRoleId, PermissionId = readDashboardPermissionId },
            new { RoleId = managerRoleId, PermissionId = manageMenuPermissionId },
            new { RoleId = managerRoleId, PermissionId = manageOrdersPermissionId });
    }
}