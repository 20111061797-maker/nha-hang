using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.Application.Features.Audit;
using RestaurantManagement.Infrastructure.Authentication;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public sealed class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetLogs([FromQuery] AuditLogFilterRequest filter, CancellationToken ct) =>
        Ok(await auditLogService.GetLogsAsync(filter, ct));

    [HttpGet("stats")]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetStats(CancellationToken ct) =>
        Ok(await auditLogService.GetStatsAsync(ct));

    [HttpGet("actions")]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetActions(CancellationToken ct) =>
        Ok(await auditLogService.GetActionTypesAsync(ct));

    [HttpGet("actors")]
    [RequirePermission("employee.read")]
    public async Task<IActionResult> GetActors(CancellationToken ct) =>
        Ok(await auditLogService.GetActorsAsync(ct));
}
