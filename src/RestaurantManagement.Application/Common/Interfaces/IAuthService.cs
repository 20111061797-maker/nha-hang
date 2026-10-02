using RestaurantManagement.Application.Common.Models;

namespace RestaurantManagement.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(string usernameOrEmail, string password, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task<AuthResult?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, string reason, CancellationToken cancellationToken);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress, CancellationToken cancellationToken);
    Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken);
    Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken);
    Task<UserProfileModel?> GetProfileAsync(Guid userId, CancellationToken cancellationToken);
}