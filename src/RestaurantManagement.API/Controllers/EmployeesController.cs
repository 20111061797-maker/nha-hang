using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Employees;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public sealed class EmployeesController(IEmployeeManagementService service) : ControllerBase
{
    [HttpGet]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetAll([FromQuery] Guid? branchId, [FromQuery] string? search, [FromQuery] bool? isActive, CancellationToken ct) =>
        Ok(await service.GetEmployeesAsync(branchId, search, isActive, ct));

    [HttpGet("roles")]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetRoles(CancellationToken ct) =>
        Ok(await service.GetRolesAsync(ct));

    [HttpGet("{id:guid}")]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        (await service.GetEmployeeAsync(id, ct)) is { } result ? Ok(result) : NotFound();

    [HttpPost]
    [RequirePermission("employee.create")]
    public async Task<IActionResult> Create(CreateEmployeeRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên nhân viên là bắt buộc." });
        if (request.BranchId == Guid.Empty)
            return BadRequest(new { message = "Chi nhánh là bắt buộc." });

        if (request.CreateLoginAccount)
        {
            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest(new { message = "Tên đăng nhập là bắt buộc khi cấp tài khoản." });
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                return BadRequest(new { message = "Mật khẩu tối thiểu 6 ký tự." });
        }

        var result = await service.CreateEmployeeAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission("employee.update")]
    public async Task<IActionResult> Update(Guid id, UpdateEmployeeRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Họ và tên nhân viên là bắt buộc." });
        if (request.BranchId == Guid.Empty)
            return BadRequest(new { message = "Chi nhánh là bắt buộc." });

        var result = await service.UpdateEmployeeAsync(id, request, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission("employee.update")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var success = await service.DeleteEmployeeAsync(id, ct);
        return success ? Ok(new { message = "Đã ngưng hoạt động nhân viên thành công." }) : NotFound();
    }
}
