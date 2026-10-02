namespace RestaurantManagement.Application.Common.Models;

public sealed class DemoUsersOptions
{
    public const string SectionName = "DemoUsers";

    public bool Enabled { get; init; }
    public string Password { get; init; } = string.Empty;
}