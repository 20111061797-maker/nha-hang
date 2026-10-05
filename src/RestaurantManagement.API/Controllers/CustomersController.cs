using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Customers;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public sealed class CustomersController(ICustomerManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, CancellationToken ct) =>
        Ok(await service.GetCustomersAsync(search, ct));

    [HttpGet("membership-levels")]
    public async Task<IActionResult> GetMembershipLevels(CancellationToken ct) =>
        Ok(await service.GetMembershipLevelsAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        (await service.GetCustomerAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(CreateCustomerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên khách hàng là bắt buộc." });
        if (string.IsNullOrWhiteSpace(request.Phone))
            return BadRequest(new { message = "Số điện thoại là bắt buộc." });

        var result = await service.CreateCustomerAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCustomerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên khách hàng là bắt buộc." });
        if (string.IsNullOrWhiteSpace(request.Phone))
            return BadRequest(new { message = "Số điện thoại là bắt buộc." });

        var result = await service.UpdateCustomerAsync(id, request, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/points")]
    public async Task<IActionResult> AdjustPoints(Guid id, AdjustCustomerPointsRequest request, CancellationToken ct)
    {
        var result = await service.AdjustPointsAsync(id, request, ct);
        return result is null ? NotFound() : Ok(result);
    }
}
