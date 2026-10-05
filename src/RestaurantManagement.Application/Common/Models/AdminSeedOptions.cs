namespace RestaurantManagement.Application.Common.Models;

public sealed class AdminSeedOptions
{
    public const string SectionName = "Admin";

    public string Username { get; set; } = "admin";
    public string Email { get; set; } = "admin@example.com";
    public string Password { get; set; } = "Admin@123456Password";
}