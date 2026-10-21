using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Application.Features.Payments;
using RestaurantManagement.Application.Features.Recipes;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Common;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using RestaurantManagement.Infrastructure.Services;

namespace RestaurantManagement.Tests.Inventory;

public sealed class RecipeAndInventoryConsumptionTests
{
    private static readonly CancellationToken C = CancellationToken.None;

    [Fact]
    public async Task Scenario1_Chế_biến_một_món_có_nhiều_nguyên_liệu()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();

        // Nguyên liệu 1: Thịt bò (kho kg, công thức 250g)
        var (ingBo, invBo, balBo) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 20m);
        // Nguyên liệu 2: Hành tây (kho g, công thức 50g)
        var (ingHanh, invHanh, balHanh) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Hành tây", "g", 1000m);
        // Nguyên liệu 3: Ớt chuông (kho g, công thức 30g)
        var (ingOt, invOt, balOt) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Ớt chuông", "g", 500m);
        // Nguyên liệu 4: Dầu ăn (kho lít, công thức 10ml)
        var (ingDau, invDau, balDau) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Dầu ăn", "lít", 5m);

        // Lưu công thức món Bò lúc lắc
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(
            product.Id,
            null,
            "Công thức Bò Lúc Lắc",
            [
                new SaveRecipeItemRequest(ingBo.Id, null, "g", 250m, 0),
                new SaveRecipeItemRequest(ingHanh.Id, null, "g", 50m, 0),
                new SaveRecipeItemRequest(ingOt.Id, null, "g", 30m, 0),
                new SaveRecipeItemRequest(ingDau.Id, null, "ml", 10m, 0)
            ]
        ), C);

        // Bếp chế biến 2 đĩa Bò lúc lắc
        var (kitchenOrder, kitchenItem) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 2);

        var result = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result.Success.Should().BeTrue();
        result.TransactionsCreated.Should().Be(4);

        // Kiểm tra tồn kho sau chế biến 2 đĩa
        // Thịt bò: 20kg - (2 * 250g = 0.5kg) = 19.5kg
        var balBoAfter = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invBo.Id);
        balBoAfter.Quantity.Should().Be(19.5m);

        // Hành tây: 1000g - (2 * 50g = 100g) = 900g
        var balHanhAfter = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invHanh.Id);
        balHanhAfter.Quantity.Should().Be(900m);

        // Ớt chuông: 500g - (2 * 30g = 60g) = 440g
        var balOtAfter = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invOt.Id);
        balOtAfter.Quantity.Should().Be(440m);

        // Dầu ăn: 5 lít - (2 * 10ml = 0.02 lít) = 4.98 lít
        var balDauAfter = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invDau.Id);
        balDauAfter.Quantity.Should().Be(4.98m);

        var txs = await context.InventoryTransactions.Where(t => t.ReferenceId == kitchenItem.Id).ToListAsync();
        txs.Should().HaveCount(4);
        txs.All(t => t.TransactionType == InventoryTransactionType.Issue).Should().BeTrue();
    }

    [Fact]
    public async Task Scenario2_Chế_biến_nhiều_món_cùng_lúc()
    {
        var (context, recipeService, consumptionService, branch, warehouse, productA) = await SetupScenarioAsync();
        var productB = new Product { Sku = "PROD_B", Name = "Gà Nướng" };
        context.Products.Add(productB);
        await context.SaveChangesAsync(C);

        var (ingBo, invBo, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "g", 5000m);
        var (ingGa, invGa, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt gà", "g", 5000m);

        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(productA.Id, null, "Recipe A", [new SaveRecipeItemRequest(ingBo.Id, null, "g", 200m)]), C);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(productB.Id, null, "Recipe B", [new SaveRecipeItemRequest(ingGa.Id, null, "g", 300m)]), C);

        // Kitchen Order có 2 món: Món A (2 đĩa) và Món B (3 đĩa)
        var order = new Order { BranchId = branch.Id, OrderNumber = "ORD-002", Status = OrderStatus.Preparing, TotalAmount = 500 };
        context.Orders.Add(order);
        var kitchenOrder = new KitchenOrder { BranchId = branch.Id, OrderId = order.Id, OrderNumberSnapshot = "ORD-002", Status = KitchenOrderStatus.Preparing };
        context.KitchenOrders.Add(kitchenOrder);
        await context.SaveChangesAsync(C);

        var itemA = new KitchenOrderItem { KitchenOrderId = kitchenOrder.Id, OrderItemId = Guid.NewGuid(), ProductId = productA.Id, ProductNameSnapshot = productA.Name, Quantity = 2 };
        var itemB = new KitchenOrderItem { KitchenOrderId = kitchenOrder.Id, OrderItemId = Guid.NewGuid(), ProductId = productB.Id, ProductNameSnapshot = productB.Name, Quantity = 3 };
        context.KitchenOrderItems.AddRange(itemA, itemB);
        await context.SaveChangesAsync(C);

        var result = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result.Success.Should().BeTrue();
        result.TransactionsCreated.Should().Be(2);

        // Bò: 5000 - 400 = 4600
        var balBo = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invBo.Id);
        balBo.Quantity.Should().Be(4600m);

        // Gà: 5000 - 900 = 4100
        var balGa = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invGa.Id);
        balGa.Quantity.Should().Be(4100m);
    }

    [Fact]
    public async Task Scenario3_Cùng_một_món_được_cập_nhật_hoàn_tất_nhiều_lần_không_bị_trừ_trùng()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 10m);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 1m)]), C);

        var (kitchenOrder, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 2);

        // Lần 1: Gọi trừ tiêu hao
        var result1 = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result1.TransactionsCreated.Should().Be(1);

        var balAfter1 = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfter1.Quantity.Should().Be(8m); // 10 - 2 = 8

        // Lần 2: Người dùng nhấn nút lại hoặc SignalR phát lại
        var result2 = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result2.TransactionsCreated.Should().Be(0);

        // Lần 3: Tiếp tục gọi lại
        var result3 = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result3.TransactionsCreated.Should().Be(0);

        // Tồn kho vẫn giữ nguyên là 8, không bị trừ thêm lần nào
        var balFinal = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balFinal.Quantity.Should().Be(8m);

        var totalTransactions = await context.InventoryTransactions.CountAsync(t => t.InventoryItemId == invItem.Id && t.TransactionType == InventoryTransactionType.Issue);
        totalTransactions.Should().Be(1);
    }

    [Fact]
    public async Task Scenario4_Hủy_món_trước_và_sau_chế_biến()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 10m);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 1m)]), C);

        // Trường hợp 4a: Hủy món trước khi chế biến (khi còn ở trạng thái New/Preparing)
        var station = new KitchenStation { BranchId = branch.Id, Code = "ST1", Name = "Station 1" };
        context.KitchenStations.Add(station);
        await context.SaveChangesAsync(C);

        var kitchenService = new KitchenManagementService(context, new TestUser(true), new TestAudit(), new TestPublisher(), consumptionService);

        var order1 = new Order { BranchId = branch.Id, OrderNumber = "ORD-CANCEL-1", Status = OrderStatus.Preparing, TotalAmount = 100, Version = 1 };
        context.Orders.Add(order1);
        var kOrder1 = new KitchenOrder { BranchId = branch.Id, OrderId = order1.Id, KitchenStationId = station.Id, OrderNumberSnapshot = "ORD-CANCEL-1", Status = KitchenOrderStatus.New, Version = 1 };
        context.KitchenOrders.Add(kOrder1);
        var kItem1 = new KitchenOrderItem { KitchenOrderId = kOrder1.Id, OrderItemId = Guid.NewGuid(), ProductId = product.Id, ProductNameSnapshot = product.Name, Quantity = 2 };
        context.KitchenOrderItems.Add(kItem1);
        await context.SaveChangesAsync(C);

        // Chuyển sang Cancelled trực tiếp
        await kitchenService.ChangeStatusAsync(kOrder1.Id, KitchenOrderStatus.Cancelled, new KitchenOrderStatusRequest(1), C);

        // Kho không hề bị trừ
        var bal1 = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        bal1.Quantity.Should().Be(10m);

        // Trường hợp 4b: Món đã chế biến (Ready) -> kho đã trừ -> sau đó hủy/bỏ món
        var order2 = new Order { BranchId = branch.Id, OrderNumber = "ORD-CANCEL-2", Status = OrderStatus.Preparing, TotalAmount = 100, Version = 1 };
        context.Orders.Add(order2);
        var kOrder2 = new KitchenOrder { BranchId = branch.Id, OrderId = order2.Id, KitchenStationId = station.Id, OrderNumberSnapshot = "ORD-CANCEL-2", Status = KitchenOrderStatus.Accepted, Version = 1 };
        context.KitchenOrders.Add(kOrder2);
        var kItem2 = new KitchenOrderItem { KitchenOrderId = kOrder2.Id, OrderItemId = Guid.NewGuid(), ProductId = product.Id, ProductNameSnapshot = product.Name, Quantity = 2 };
        context.KitchenOrderItems.Add(kItem2);
        await context.SaveChangesAsync(C);

        // Chuyển sang Ready -> kho bị trừ 2kg -> còn 8kg
        await kitchenService.ChangeStatusAsync(kOrder2.Id, KitchenOrderStatus.Ready, new KitchenOrderStatusRequest(1), C);
        var balAfterReady = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfterReady.Quantity.Should().Be(8m);

        // Khách hủy sau chế biến: nguyên liệu đã tiêu hao được giữ nguyên (8kg)
        balAfterReady.Quantity.Should().Be(8m);
    }

    [Fact]
    public async Task Scenario5_Làm_hỏng_món_và_làm_lại_món()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 10m);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 1m)]), C);

        var (kitchenOrder, kitchenItem) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 1);

        // Chế biến hoàn tất lần 1: trừ 1kg -> còn 9kg
        await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        var bal1 = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        bal1.Quantity.Should().Be(9m);

        // Bếp làm cháy/hỏng món: Ghi nhận hao hụt
        var wasteResult = await consumptionService.RecordWasteAsync(new RecordWasteRequest(
            branch.Id,
            kitchenOrder.Id,
            product.Id,
            null,
            1m,
            "Bếp làm cháy thịt"
        ), C);
        wasteResult.Success.Should().BeTrue();

        // Tồn kho giảm thêm 1kg do cháy -> còn 8kg
        var balAfterWaste = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfterWaste.Quantity.Should().Be(8m);

        // Bếp làm lại món cho khách
        var reCookResult = await consumptionService.RecordReCookAsync(new RecordReCookRequest(
            kitchenOrder.Id,
            kitchenItem.Id,
            "Làm lại do đĩa trước bị cháy"
        ), C);
        reCookResult.Success.Should().BeTrue();

        // Tồn kho giảm thêm 1kg cho lần làm lại -> còn 7kg
        var balAfterReCook = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfterReCook.Quantity.Should().Be(7m);

        // Lịch sử giao dịch lưu đầy đủ: 1 tiêu hao ban đầu + 1 hao hụt hỏng + 1 tiêu hao làm lại
        var txs = await context.InventoryTransactions
            .Where(t => t.InventoryItemId == invItem.Id && t.TransactionType == InventoryTransactionType.Issue)
            .ToListAsync();
        txs.Should().HaveCount(3);
    }

    [Fact]
    public async Task Scenario6_Thiếu_nguyên_liệu_và_cảnh_báo()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 1m); // Chỉ còn 1kg
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 0.5m)]), C);

        // Kiểm tra tồn kho cho 3 đĩa (cần 1.5kg, kho có 1kg)
        var stockCheck = await recipeService.CheckStockForProductAsync(branch.Id, product.Id, null, 3, C);
        stockCheck.HasRecipe.Should().BeTrue();
        stockCheck.AllIngredientsAvailable.Should().BeFalse();
        stockCheck.Ingredients[0].IsSufficient.Should().BeFalse();

        // Khi chế biến vượt mức tồn kho, hệ thống cảnh báo tồn âm
        var (kitchenOrder, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 3);
        var deductResult = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        deductResult.Success.Should().BeTrue();
        deductResult.Warnings.Should().NotBeEmpty();

        var bal = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        bal.Quantity.Should().Be(-0.5m); // 1kg - 1.5kg = -0.5kg
    }

    [Fact]
    public async Task Scenario7_Hai_đơn_cùng_sử_dụng_một_nguyên_liệu()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 20m);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 2m)]), C);

        var (kOrder1, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 3); // Cần 6kg
        var (kOrder2, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 4); // Cần 8kg

        await consumptionService.DeductForKitchenOrderAsync(kOrder1.Id, C);
        await consumptionService.DeductForKitchenOrderAsync(kOrder2.Id, C);

        var bal = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        bal.Quantity.Should().Be(6m); // 20 - 6 - 8 = 6kg
    }

    [Fact]
    public async Task Scenario8_Món_chưa_có_công_thức_không_làm_hỏng_tiến_trình()
    {
        var (context, _, consumptionService, branch, _, product) = await SetupScenarioAsync();
        // Không lưu công thức cho product

        var (kitchenOrder, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 1);

        var result = await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);
        result.Success.Should().BeTrue();
        result.TransactionsCreated.Should().Be(0);
        result.Warnings.Should().Contain(w => w.Contains("chưa thiết lập công thức"));
    }

    [Fact]
    public async Task Scenario9_Quy_đổi_đơn_vị_g_kg_và_ml_lit()
    {
        // 250 g sang kg = 0.25 kg
        UnitConversionHelper.ConvertQuantity(250m, "g", "kg").Should().Be(0.25m);
        // 2.5 kg sang g = 2500 g
        UnitConversionHelper.ConvertQuantity(2.5m, "kg", "g").Should().Be(2500m);
        // 500 ml sang lít = 0.5 lít
        UnitConversionHelper.ConvertQuantity(500m, "ml", "lít").Should().Be(0.5m);
        // 2 lít sang ml = 2000 ml
        UnitConversionHelper.ConvertQuantity(2m, "lít", "ml").Should().Be(2000m);
        // Cùng đơn vị -> giữ nguyên
        UnitConversionHelper.ConvertQuantity(10m, "kg", "kg").Should().Be(10m);
    }

    [Fact]
    public async Task Scenario10_Thanh_toán_hóa_đơn_không_trừ_kho_lần_thứ_hai()
    {
        var (context, recipeService, consumptionService, branch, warehouse, product) = await SetupScenarioAsync();
        var (ing, invItem, _) = await CreateIngredientWithStockAsync(context, warehouse.Id, "Thịt bò", "kg", 10m);
        await recipeService.SaveRecipeAsync(new SaveRecipeRequest(product.Id, null, "Recipe", [new SaveRecipeItemRequest(ing.Id, null, "kg", 1m)]), C);

        // Order được chế biến xong
        var (kitchenOrder, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 2);
        await consumptionService.DeductForKitchenOrderAsync(kitchenOrder.Id, C);

        var balAfterCooking = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfterCooking.Quantity.Should().Be(8m);
        var txCountAfterCooking = await context.InventoryTransactions.CountAsync(t => t.InventoryItemId == invItem.Id);

        // Bếp hoàn tất chế biến và ra đồ ăn
        kitchenOrder.Status = KitchenOrderStatus.Ready;
        await context.SaveChangesAsync(C);

        // Khách thanh toán hóa đơn
        var paymentService = new PaymentManagementService(context, new TestUser(true), new TestAudit());
        var paymentResult = await paymentService.CreateAsync(kitchenOrder.OrderId, new CreatePaymentRequest(
            PaymentMethod.Cash,
            200m,
            200m,
            null,
            null,
            null,
            null,
            null
        ), C);

        paymentResult.Status.Should().Be(PaymentStatus.Completed);

        // Xác minh tồn kho và số lượng giao dịch kho KHÔNG hề thay đổi sau thanh toán
        var balAfterPayment = await context.InventoryBalances.SingleAsync(b => b.InventoryItemId == invItem.Id);
        balAfterPayment.Quantity.Should().Be(8m);

        var txCountAfterPayment = await context.InventoryTransactions.CountAsync(t => t.InventoryItemId == invItem.Id);
        txCountAfterPayment.Should().Be(txCountAfterCooking);
    }

    [Fact]
    public async Task Scenario11_Thanh_toán_bị_chặn_khi_bếp_chưa_ra_món_hoàn_tất()
    {
        var (context, _, _, branch, _, product) = await SetupScenarioAsync();
        var (kitchenOrder, _) = await CreateKitchenOrderWithItemAsync(context, branch.Id, product.Id, product.Name, 1);
        kitchenOrder.Status = KitchenOrderStatus.Preparing;
        await context.SaveChangesAsync(C);

        var paymentService = new PaymentManagementService(context, new TestUser(true), new TestAudit());
        var act = () => paymentService.CreateAsync(kitchenOrder.OrderId, new CreatePaymentRequest(
            PaymentMethod.Cash,
            200m,
            200m,
            null,
            null,
            null,
            null,
            null
        ), C);

        await act.Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>()
            .WithMessage("*chưa hoàn tất chế biến và ra đồ ăn*");
    }

    // --- Helpers ---
    private static async Task<(RestaurantDbContext Context, RecipeService RecipeService, InventoryConsumptionService ConsumptionService, Branch Branch, Warehouse Warehouse, Product Product)>
        SetupScenarioAsync()
    {
        var context = new RestaurantDbContext(new DbContextOptionsBuilder<RestaurantDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var user = new TestUser(true);
        var audit = new TestAudit();

        var branch = new Branch { Code = "BR_TEST", Name = "Chi nhánh Test", IsActive = true };
        context.Branches.Add(branch);
        var warehouse = new Warehouse { BranchId = branch.Id, Name = "Kho Chi nhánh Test", IsActive = true };
        context.Warehouses.Add(warehouse);

        var product = new Product { Sku = "BO_LUC_LAC", Name = "Bò Lúc Lắc", IsActive = true };
        context.Products.Add(product);
        await context.SaveChangesAsync(C);

        var recipeService = new RecipeService(context, user, audit);
        var consumptionService = new InventoryConsumptionService(context, user, audit);

        return (context, recipeService, consumptionService, branch, warehouse, product);
    }

    private static async Task<(Ingredient Ingredient, InventoryItem InvItem, InventoryBalance Balance)>
        CreateIngredientWithStockAsync(RestaurantDbContext context, Guid warehouseId, string name, string unitName, decimal initialQty)
    {
        var unit = await context.Units.FirstOrDefaultAsync(u => u.Name.ToLower() == unitName.ToLower(), C);
        if (unit == null)
        {
            unit = new Unit { Code = unitName.ToUpperInvariant(), Name = unitName, ConversionFactor = 1m };
            context.Units.Add(unit);
            await context.SaveChangesAsync(C);
        }

        var ingredient = new Ingredient { Code = $"ING_{Guid.NewGuid():N}"[..8], Name = name, BaseUnitId = unit.Id, IsActive = true };
        context.Ingredients.Add(ingredient);
        await context.SaveChangesAsync(C);

        var invItem = new InventoryItem { WarehouseId = warehouseId, IngredientId = ingredient.Id, UnitId = unit.Id, IsActive = true };
        context.InventoryItems.Add(invItem);
        await context.SaveChangesAsync(C);

        var balance = new InventoryBalance { InventoryItemId = invItem.Id, Quantity = initialQty, AverageUnitCost = 50000m, Version = 1 };
        context.InventoryBalances.Add(balance);
        await context.SaveChangesAsync(C);

        return (ingredient, invItem, balance);
    }

    private static async Task<(KitchenOrder Order, KitchenOrderItem Item)>
        CreateKitchenOrderWithItemAsync(RestaurantDbContext context, Guid branchId, Guid productId, string productName, decimal quantity)
    {
        var order = new Order { BranchId = branchId, OrderNumber = $"ORD_{Guid.NewGuid():N}"[..8], Status = OrderStatus.Preparing, TotalAmount = 200, Version = 1 };
        context.Orders.Add(order);
        var kitchenOrder = new KitchenOrder { BranchId = branchId, OrderId = order.Id, OrderNumberSnapshot = order.OrderNumber, Status = KitchenOrderStatus.Preparing, Version = 1 };
        context.KitchenOrders.Add(kitchenOrder);
        await context.SaveChangesAsync(C);

        var item = new KitchenOrderItem { KitchenOrderId = kitchenOrder.Id, OrderItemId = Guid.NewGuid(), ProductId = productId, ProductNameSnapshot = productName, Quantity = quantity };
        context.KitchenOrderItems.Add(item);
        await context.SaveChangesAsync(C);

        return (kitchenOrder, item);
    }

    private sealed class TestUser(bool administrator) : ICurrentUserService
    {
        public Guid? UserId => administrator ? null : Guid.NewGuid();
        public string? Username => "tester";
        public IReadOnlyCollection<string> Roles => [];
        public IReadOnlyCollection<string> Permissions => [];
        public Guid? BranchId => null;
        public bool IsAdministrator => administrator;
    }

    private sealed class TestAudit : IAuditWriter
    {
        public Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class TestPublisher : IKitchenEventPublisher
    {
        public Task PublishAsync(KitchenEvent kitchenEvent, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
