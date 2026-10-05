namespace RestaurantManagement.Application.Common.Models;

public sealed class DemoUsersOptions
{
    public const string SectionName = "DemoUsers";

    public bool Enabled { get; set; } = true;
    public string Password { get; set; } = "Demo@123456Password";
}