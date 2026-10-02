using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RestaurantManagement.API.Services;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Features.Auth.DTOs;

namespace RestaurantManagement.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, ICurrentUserService currentUserService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username/email and password are required." });
        }

        var result = await authService.LoginAsync(request.UsernameOrEmail, request.Password, GetIpAddress(), HttpContext?.Request.Headers.UserAgent, cancellationToken);
        return result is null ? Unauthorized(new { message = "Invalid credentials." }) : Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RefreshAsync(request.RefreshToken, GetIpAddress(), HttpContext?.Request.Headers.UserAgent, cancellationToken);
        return result is null ? Unauthorized(new { message = "Invalid or expired refresh token." }) : Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken cancellationToken)
    {
        await authService.RevokeRefreshTokenAsync(request.RefreshToken, GetIpAddress(), "User logout", cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (currentUserService.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        var profile = await authService.GetProfileAsync(userId, cancellationToken);
        return profile is null ? Unauthorized() : Ok(profile);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (currentUserService.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        var changed = await authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, GetIpAddress(), cancellationToken);
        return changed ? NoContent() : BadRequest(new { message = "Password change failed." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        await authService.RequestPasswordResetAsync(request.Email, cancellationToken);
        return Accepted(new { message = "If the account exists, password reset instructions will be sent." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var reset = await authService.ResetPasswordAsync(request.Token, request.NewPassword, cancellationToken);
        return reset ? NoContent() : BadRequest(new { message = "Invalid or expired reset request." });
    }

    private string? GetIpAddress() => HttpContext?.Connection.RemoteIpAddress?.ToString();
}