using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.API.Controllers;

namespace RestaurantManagement.Tests.API;

public sealed class HealthControllerTests
{
    [Fact]
    public void Get_returns_healthy_status()
    {
        var result = new HealthController().Get().Should().BeOfType<OkObjectResult>().Subject;

        result.StatusCode.Should().Be(200);
        result.Value.Should().NotBeNull();
    }
}