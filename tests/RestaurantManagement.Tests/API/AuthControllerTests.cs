using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using RestaurantManagement.API.Controllers;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Common.Models;
using RestaurantManagement.Application.Features.Auth.DTOs;

namespace RestaurantManagement.Tests.API;

public sealed class AuthControllerTests
{
    [Fact]
    public async Task Login_with_valid_credentials_returns_tokens()
    {
        var service = new FakeAuthService { LoginResult = CreateResult() };
        var result = await CreateController(service).Login(new LoginRequest("admin", "Password123!"), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Login_with_invalid_credentials_returns_unauthorized()
    {
        var result = await CreateController(new FakeAuthService()).Login(new LoginRequest("admin", "wrong"), CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Refresh_with_invalid_token_returns_unauthorized()
    {
        var result = await CreateController(new FakeAuthService()).Refresh(new RefreshTokenRequest("invalid"), CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Logout_returns_no_content()
    {
        var result = await CreateController(new FakeAuthService { RevokeResult = true }).Logout(new LogoutRequest("token"), CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Me_returns_current_profile_for_authenticated_user()
    {
        var result = await CreateController(new FakeAuthService { ProfileResult = CreateResult().User }, new FakeCurrentUserService { CurrentUserId = Guid.NewGuid() }).Me(CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Me_returns_unauthorized_without_user_claim()
    {
        var result = await CreateController(new FakeAuthService(), new FakeCurrentUserService()).Me(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task Change_password_returns_no_content_when_service_accepts()
    {
        var result = await CreateController(new FakeAuthService { ChangePasswordResult = true }, new FakeCurrentUserService { CurrentUserId = Guid.NewGuid() }).ChangePassword(new ChangePasswordRequest("old", "NewPassword123!"), CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public void Permission_attribute_creates_dynamic_policy_name()
    {
        var attribute = new RestaurantManagement.Infrastructure.Authentication.RequirePermissionAttribute("order.create");

        attribute.Policy.Should().Be("permission:order.create");
    }

    [Fact]
    public async Task Login_with_missing_fields_returns_bad_request()
    {
        var result = await CreateController(new FakeAuthService()).Login(new LoginRequest("", ""), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Forgot_password_returns_accepted_without_account_disclosure()
    {
        var result = await CreateController(new FakeAuthService()).ForgotPassword(new ForgotPasswordRequest("unknown@example.com"), CancellationToken.None);

        result.Should().BeOfType<AcceptedResult>();
    }

    [Fact]
    public async Task Reset_password_rejects_invalid_reset_request()
    {
        var result = await CreateController(new FakeAuthService { ResetPasswordResult = false }).ResetPassword(new ResetPasswordRequest("invalid", "NewPassword123!"), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Change_password_rejects_failed_verification()
    {
        var result = await CreateController(new FakeAuthService { ChangePasswordResult = false }, new FakeCurrentUserService { CurrentUserId = Guid.NewGuid() }).ChangePassword(new ChangePasswordRequest("wrong", "NewPassword123!"), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Me_returns_unauthorized_when_profile_is_missing()
    {
        var result = await CreateController(new FakeAuthService { ProfileResult = null }, new FakeCurrentUserService { CurrentUserId = Guid.NewGuid() }).Me(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    private static AuthController CreateController(FakeAuthService service, FakeCurrentUserService? currentUser = null) =>
        new(service, currentUser ?? new FakeCurrentUserService { CurrentUserId = Guid.NewGuid() });

    private static AuthResult CreateResult() => new(
        "access-token",
        "refresh-token",
        DateTimeOffset.UtcNow.AddMinutes(15),
        new UserProfileModel(Guid.NewGuid(), "admin", "admin@example.com", ["Admin"], ["order.create"], null));

    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? CurrentUserId { get; init; }
        public Guid? UserId => CurrentUserId;
        public string? Username => "admin";
        public IReadOnlyCollection<string> Roles => ["Admin"];
        public IReadOnlyCollection<string> Permissions => ["order.create"];
        public Guid? BranchId => null;
        public bool IsAdministrator => true;
    }

    private sealed class FakeAuthService : IAuthService
    {
        public AuthResult? LoginResult { get; init; }
        public UserProfileModel? ProfileResult { get; init; }
        public bool RevokeResult { get; init; }
        public bool ChangePasswordResult { get; init; }
        public bool ResetPasswordResult { get; init; } = true;

        public Task<AuthResult?> LoginAsync(string usernameOrEmail, string password, string? ipAddress, string? userAgent, CancellationToken cancellationToken) => Task.FromResult(LoginResult);
        public Task<AuthResult?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken) => Task.FromResult(LoginResult);
        public Task<bool> RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, string reason, CancellationToken cancellationToken) => Task.FromResult(RevokeResult);
        public Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress, CancellationToken cancellationToken) => Task.FromResult(ChangePasswordResult);
        public Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken) => Task.FromResult(ResetPasswordResult);
        public Task<UserProfileModel?> GetProfileAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult(ProfileResult);
    }
}