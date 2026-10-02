using FluentAssertions;
using RestaurantManagement.Domain.Common;

namespace RestaurantManagement.Tests.Domain;

public sealed class BaseEntityTests
{
    [Fact]
    public void New_entity_has_id_and_utc_timestamps()
    {
        var entity = new TestEntity();

        entity.Id.Should().NotBeEmpty();
        entity.CreatedAt.Offset.Should().Be(TimeSpan.Zero);
        entity.UpdatedAt.Should().Be(entity.CreatedAt);
    }

    private sealed class TestEntity : BaseEntity;
}