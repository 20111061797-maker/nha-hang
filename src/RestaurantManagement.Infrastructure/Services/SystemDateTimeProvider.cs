using RestaurantManagement.Application.Common.Interfaces;

namespace RestaurantManagement.Infrastructure.Services;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}