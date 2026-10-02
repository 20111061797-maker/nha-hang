using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using RestaurantManagement.Application.Common.Exceptions;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Branches;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Domain.Enums;
using RestaurantManagement.Infrastructure.Persistence.DbContext;
using RestaurantManagement.Infrastructure.Services;
using DomainApplicationException = RestaurantManagement.Application.Common.Exceptions.ApplicationException;

namespace RestaurantManagement.Tests.Branches;

public sealed class BranchManagementServiceTests
{
    [Fact]
    public async Task Create_branch_succeeds()
    {
        var service = CreateService();
        var result = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);

        result.Code.Should().Be("B001");
    }

    [Fact]
    public async Task Duplicate_branch_code_is_rejected()
    {
        var service = CreateService();
        await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateBranchAsync(new CreateBranchRequest("B001", "Other", null, null, null, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Get_branch_returns_created_branch()
    {
        var service = CreateService();
        var created = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);

        (await service.GetBranchAsync(created.Id, CancellationToken.None)).Should().NotBeNull();
    }

    [Fact]
    public async Task Update_branch_changes_name()
    {
        var service = CreateService();
        var created = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var updated = await service.UpdateBranchAsync(created.Id, new UpdateBranchRequest("B001", "Updated", null, null, null, null), CancellationToken.None);

        updated!.Name.Should().Be("Updated");
    }

    [Fact]
    public async Task Deactivate_branch_changes_active_state()
    {
        var service = CreateService();
        var created = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);

        await service.SetBranchStatusAsync(created.Id, false, CancellationToken.None);

        (await service.GetBranchAsync(created.Id, CancellationToken.None))!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Unauthorized_user_cannot_access_branch()
    {
        var context = CreateContext();
        var branch = new Branch { Code = "B001", Name = "Main" };
        context.Branches.Add(branch);
        await context.SaveChangesAsync();
        var service = CreateService(context, new TestCurrentUser { IsAdministratorValue = false });

        await FluentActions.Awaiting(() => service.GetBranchAsync(branch.Id, CancellationToken.None)).Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task Create_area_succeeds_for_branch()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);

        (await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None)).Name.Should().Be("Ground");
    }

    [Fact]
    public async Task Duplicate_area_name_in_branch_is_rejected()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 2), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Same_area_name_in_different_branches_is_allowed()
    {
        var service = CreateService();
        var first = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var second = await service.CreateBranchAsync(new CreateBranchRequest("B002", "Other", null, null, null, null), CancellationToken.None);

        await service.CreateAreaAsync(first.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);
        var result = await service.CreateAreaAsync(second.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);

        result.BranchId.Should().Be(second.Id);
    }

    [Fact]
    public async Task Table_area_branch_mismatch_is_rejected()
    {
        var service = CreateService();
        var first = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var second = await service.CreateBranchAsync(new CreateBranchRequest("B002", "Other", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(second.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateTableAsync(first.Id, new CreateTableRequest(area.Id, "01", null, 4, "qr-01", 1), CancellationToken.None)).Should().ThrowAsync<DomainApplicationException>();
    }

    [Fact]
    public async Task Table_capacity_must_be_positive()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 0, "qr-01", 1), CancellationToken.None)).Should().ThrowAsync<DomainApplicationException>();
    }

    [Fact]
    public async Task Duplicate_table_number_in_branch_is_rejected()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);
        await service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 4, "qr-01", 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 4, "qr-02", 2), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Duplicate_qr_identifier_is_rejected()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);
        await service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 4, "same-qr", 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "02", null, 4, "same-qr", 2), CancellationToken.None)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Status_change_creates_append_only_history()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);
        var table = await service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 4, "qr-01", 1), CancellationToken.None);

        await service.ChangeTableStatusAsync(table.Id, new ChangeTableStatusRequest(TableStatus.Occupied, "Opened"), CancellationToken.None);

        (await context.TableStatusHistories.CountAsync(x => x.TableId == table.Id)).Should().Be(2);
        (await context.TableStatusHistories.OrderByDescending(x => x.CreatedAt).FirstAsync()).NewStatus.Should().Be(TableStatus.Occupied);
    }

    [Fact]
    public async Task Invalid_status_transition_is_rejected()
    {
        var service = CreateService();
        var branch = await service.CreateBranchAsync(new CreateBranchRequest("B001", "Main", null, null, null, null), CancellationToken.None);
        var area = await service.CreateAreaAsync(branch.Id, new CreateAreaRequest("Ground", null, 1), CancellationToken.None);
        var table = await service.CreateTableAsync(branch.Id, new CreateTableRequest(area.Id, "01", null, 4, "qr-01", 1), CancellationToken.None);

        await FluentActions.Awaiting(() => service.ChangeTableStatusAsync(table.Id, new ChangeTableStatusRequest(TableStatus.Cleaning, null), CancellationToken.None)).Should().ThrowAsync<DomainApplicationException>();
    }

    private static BranchManagementService CreateService(RestaurantDbContext? context = null, TestCurrentUser? currentUser = null)
    {
        context ??= CreateContext();
        return new BranchManagementService(context, currentUser ?? new TestCurrentUser(), new TestAuditWriter());
    }

    private static RestaurantDbContext CreateContext() => new(new DbContextOptionsBuilder<RestaurantDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private sealed class TestCurrentUser : ICurrentUserService
    {
        public bool IsAdministratorValue { get; init; } = true;
        public Guid? UserId => null;
        public string? Username => "test";
        public IReadOnlyCollection<string> Roles => [];
        public IReadOnlyCollection<string> Permissions => [];
        public Guid? BranchId => null;
        public bool IsAdministrator => IsAdministratorValue;
    }

    private sealed class TestAuditWriter : IAuditWriter
    {
        public Task WriteAsync(string action, string entityType, Guid? entityId, string? actorName, string? ipAddress, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}