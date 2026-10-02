namespace RestaurantManagement.Application.Common.Models;

public sealed class AdminSeedOptions
{
    public const string SectionName = "Admin";

    public string Username { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}