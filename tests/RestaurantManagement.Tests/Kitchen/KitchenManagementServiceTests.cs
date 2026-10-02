using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Kitchen;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using RestaurantManagement.Infrastructure.Services;

namespace RestaurantManagement.Tests.Kitchen;

public sealed class KitchenManagementServiceTests
{
    [Fact]
    public async Task Creates_station_with_branch_scope()
    {
        var (service, _, branch, _) = Setup();
        var station = await service.CreateStationAsync(branch.Id, new CreateKitchenStationRequest("GRILL", "Grill", "Hot line", 1), C);
        station.Code.Should().Be("GRILL");
        station.BranchId.Should().Be(branch.Id);
    }

    [Fact]
    public async Task Inactive_station_remains_readable_after_update()
    {
        var (service, _, branch, _) = Setup();
        var station = await service.CreateStationAsync(branch.Id, new CreateKitchenStationRequest("BAR", "Bar", null, 1), C);
        var updated = await service.UpdateStationAsync(station.Id, new UpdateKitchenStationRequest("BAR", "Bar", null, 1, false), C);
        updated!.IsActive.Should().BeFalse();
        (await service.GetStationAsync(station.Id, C))!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Wrong_branch_station_read_is_forbidden()
    {
        var (service, _, branch, _) = Setup(false);
        await FluentActions.Awaiting(() => service.GetStationsAsync(branch.Id, C)).Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Confirmed_order_routes_product_to_mapped_station()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var result = await service.CreateForConfirmedOrderAsync(order.Id, C);
        result.Should().ContainSingle();
        result[0].StationId.Should().Be(station.Id);
        result[0].Items.Should().ContainSingle(x => x.ProductName == "Pho Bo");
    }

    [Fact]
    public async Task Draft_order_cannot_create_kitchen_work()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Open);
        await FluentActions.Awaiting(() => service.CreateForConfirmedOrderAsync(order.Id, C)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
        (await context.KitchenOrders.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Cancelled_order_cannot_create_kitchen_work()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Cancelled);
        await FluentActions.Awaiting(() => service.CreateForConfirmedOrderAsync(order.Id, C)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Repeated_projection_does_not_duplicate_kitchen_order()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        await service.CreateForConfirmedOrderAsync(order.Id, C);
        await service.CreateForConfirmedOrderAsync(order.Id, C);
        (await context.KitchenOrders.CountAsync()).Should().Be(1);
        (await context.KitchenOrderItems.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Product_and_modifier_snapshots_are_preserved()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        await service.CreateForConfirmedOrderAsync(order.Id, C);
        context.Products.Single().Name = "Renamed";
        context.Modifiers.Single().Name = "Renamed modifier";
        await context.SaveChangesAsync();
        var detail = (await service.GetBranchOrdersAsync(branch.Id, station.Id, null, C)).Single();
        detail.Items.Single().ProductName.Should().Be("Pho Bo");
        detail.Items.Single().Modifiers.Should().Contain("Extra Cheese");
    }

    [Fact]
    public async Task New_order_can_be_accepted_started_ready_and_completed()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var ticket = (await service.CreateForConfirmedOrderAsync(order.Id, C)).Single();
        ticket = (await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Accepted, new KitchenOrderStatusRequest(ticket.Version), C))!;
        ticket = (await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Preparing, new KitchenOrderStatusRequest(ticket.Version), C))!;
        ticket = (await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Ready, new KitchenOrderStatusRequest(ticket.Version), C))!;
        ticket = (await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Completed, new KitchenOrderStatusRequest(ticket.Version), C))!;
        ticket.Status.Should().Be(KitchenOrderStatus.Completed);
    }

    [Fact]
    public async Task Invalid_status_jump_is_rejected()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var ticket = (await service.CreateForConfirmedOrderAsync(order.Id, C)).Single();
        await FluentActions.Awaiting(() => service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Ready, new KitchenOrderStatusRequest(ticket.Version), C)).Should().ThrowAsync<RestaurantManagement.Application.Common.Exceptions.ApplicationException>();
    }

    [Fact]
    public async Task Active_order_can_be_cancelled_and_is_not_deleted()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var ticket = (await service.CreateForConfirmedOrderAsync(order.Id, C)).Single();
        var cancelled = await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Cancelled, new KitchenOrderStatusRequest(ticket.Version), C);
        cancelled!.Status.Should().Be(KitchenOrderStatus.Cancelled);
        (await context.KitchenOrders.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Stale_version_is_conflict()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var ticket = (await service.CreateForConfirmedOrderAsync(order.Id, C)).Single();
        await service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Accepted, new KitchenOrderStatusRequest(ticket.Version), C);
        await FluentActions.Awaiting(() => service.ChangeStatusAsync(ticket.Id, KitchenOrderStatus.Preparing, new KitchenOrderStatusRequest(ticket.Version), C)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Event_is_published_after_projection_save()
    {
        var (service, context, branch, station, publisher) = SetupWithPublisher();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        await service.CreateForConfirmedOrderAsync(order.Id, C);
        publisher.Events.Should().ContainSingle(x => x.EventName == "KitchenOrderCreated");
    }

    [Fact]
    public async Task Active_query_excludes_completed_orders()
    {
        var (service, context, branch, station) = Setup();
        var order = await AddOrderAsync(context, branch, station, OrderStatus.Confirmed);
        var ticket = (await service.CreateForConfirmedOrderAsync(order.Id, C)).Single();
        foreach (var status in new[] { KitchenOrderStatus.Accepted, KitchenOrderStatus.Preparing, KitchenOrderStatus.Ready, KitchenOrderStatus.Completed }) ticket = (await service.ChangeStatusAsync(ticket.Id, status, new KitchenOrderStatusRequest(ticket.Version), C))!;
        (await service.GetBranchOrdersAsync(branch.Id, station.Id, null, C)).Should().BeEmpty();
    }

    private static readonly CancellationToken C = CancellationToken.None;

    private static (KitchenManagementService Service, RestaurantDbContext Context, Branch Branch, KitchenStation Station) Setup(bool administrator = true)
    {
        var context = CreateContext(Guid.NewGuid().ToString());
        var branch = new Branch { Code = Guid.NewGuid().ToString(), Name = "Main" };
        var station = new KitchenStation { BranchId = branch.Id, Code = "GRILL", Name = "Grill", IsActive = true };
        var product = new Product { Sku = Guid.NewGuid().ToString(), Name = "Pho Bo" };
        var group = new ModifierGroup { Name = "Extras", MaximumSelections = 2 };
        var modifier = new Modifier { ModifierGroupId = group.Id, Name = "Extra Cheese", DefaultPrice = 1 };
        context.Branches.Add(branch); context.KitchenStations.Add(station); context.Products.Add(product); context.ModifierGroups.Add(group); context.Modifiers.Add(modifier);
        context.KitchenStationProducts.Add(new KitchenStationProduct { KitchenStationId = station.Id, ProductId = product.Id });
        context.SaveChanges();
        return (new KitchenManagementService(context, new TestUser(administrator), new TestAudit(), new TestPublisher()), context, branch, station);
    }

    private static (KitchenManagementService Service, RestaurantDbContext Context, Branch Branch, KitchenStation Station, TestPublisher Publisher) SetupWithPublisher()
    {
        var context = CreateContext(Guid.NewGuid().ToString()); var branch = new Branch { Code = Guid.NewGuid().ToString(), Name = "Main" }; var station = new KitchenStation { BranchId = branch.Id, Code = "GRILL", Name = "Grill" }; var product = new Product { Sku = Guid.NewGuid().ToString(), Name = "Pho Bo" }; var group = new ModifierGroup { Name = "Extras", MaximumSelections = 2 }; var modifier = new Modifier { ModifierGroupId = group.Id, Name = "Extra Cheese", DefaultPrice = 1 }; context.Branches.Add(branch); context.KitchenStations.Add(station); context.Products.Add(product); context.ModifierGroups.Add(group); context.Modifiers.Add(modifier); context.KitchenStationProducts.Add(new KitchenStationProduct { KitchenStationId = station.Id, ProductId = product.Id }); context.SaveChanges(); var publisher = new TestPublisher(); return (new KitchenManagementService(context, new TestUser(true), new TestAudit(), publisher), context, branch, station, publisher);
    }

    private static async Task<Order> AddOrderAsync(RestaurantDbContext context, Branch branch, KitchenStation station, OrderStatus status)
    {
        var product = context.Products.Single(); var modifier = context.Modifiers.Single(); var order = new Order { BranchId = branch.Id, OrderNumber = Guid.NewGuid().ToString(), OrderType = OrderType.DineIn, Status = status, TotalAmount = 100, Version = 1 }; var item = new OrderItem { OrderId = order.Id, ProductId = product.Id, ProductNameSnapshot = product.Name, Quantity = 1, UnitPrice = 100, LineTotal = 100, Notes = "Less salt" }; context.Orders.Add(order); context.OrderItems.Add(item); context.OrderItemModifiers.Add(new OrderItemModifier { OrderItemId = item.Id, ModifierId = modifier.Id, ModifierNameSnapshot = modifier.Name, Quantity = 1, UnitPrice = 1, TotalPrice = 1 }); await context.SaveChangesAsync(); return order;
    }

    private static RestaurantDbContext CreateContext(string name) => new(new DbContextOptionsBuilder<RestaurantDbContext>().UseInMemoryDatabase(name).Options);
    private sealed class TestUser(bool administrator) : ICurrentUserService { public Guid? UserId => administrator ? null : Guid.NewGuid(); public string? Username => "test"; public IReadOnlyCollection<string> Roles => []; public IReadOnlyCollection<string> Permissions => []; public Guid? BranchId => null; public bool IsAdministrator => administrator; }
    private sealed class TestAudit : IAuditWriter { public Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken) => Task.CompletedTask; }
    private sealed class TestPublisher : IKitchenEventPublisher { public List<KitchenEvent> Events { get; } = []; public Task PublishAsync(KitchenEvent kitchenEvent, CancellationToken cancellationToken) { Events.Add(kitchenEvent); return Task.CompletedTask; } }
}