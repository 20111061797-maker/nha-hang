using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RestaurantManagement.Application.Common.Interfaces;
using RestaurantManagement.Application.Common.Models;
using RestaurantManagement.Domain.Entities;
using RestaurantManagement.Infrastructure.Persistence.DbContext;

namespace RestaurantManagement.Infrastructure.Authentication;

public sealed class AuthService(
    RestaurantDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IOptions<JwtOptions> jwtOptions,
    IOptions<PasswordPolicyOptions> passwordPolicy,
    IEmailSender emailSender,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly JwtOptions options = jwtOptions.Value;

    public async Task<AuthResult?> LoginAsync(string usernameOrEmail, string password, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var normalized = usernameOrEmail.Trim().ToUpperInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Username.ToUpper() == normalized || x.Email.ToUpper() == normalized, cancellationToken);

        if (user is null || !user.IsActive || user.LockoutEndAt > DateTimeOffset.UtcNow)
        {
            logger.LogWarning("Authentication failed for supplied username or email");
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount++;
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogWarning("Authentication failed for user {UserId}", user.Id);
            return null;
        }

        user.AccessFailedCount = 0;
        user.LastLoginAt = DateTimeOffset.UtcNow;
        var result = await IssueTokensAsync(user, ipAddress, userAgent, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("User {UserId} authenticated successfully", user.Id);
        return result;
    }

    public async Task<AuthResult?> RefreshAsync(string refreshToken, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);
        if (storedToken is null)
        {
            return null;
        }

        if (storedToken.RevokedAt is not null)
        {
            await RevokeFamilyAsync(storedToken.FamilyId, "Refresh token reuse detected", ipAddress, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogWarning("Refresh token reuse detected for family {FamilyId}", storedToken.FamilyId);
            return null;
        }

        if (storedToken.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return null;
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == storedToken.UserId && x.IsActive, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var newRefreshToken = CreateRawToken();
        storedToken.RevokedAt = DateTimeOffset.UtcNow;
        storedToken.RevokedByIp = ipAddress;
        storedToken.RevocationReason = "Rotated";
        storedToken.ReplacedByTokenHash = HashToken(newRefreshToken);

        var result = await IssueTokensAsync(user, ipAddress, userAgent, cancellationToken, storedToken.FamilyId, newRefreshToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return result;
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, string reason, CancellationToken cancellationToken)
    {
        var token = await dbContext.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == HashToken(refreshToken), cancellationToken);
        if (token is null || token.RevokedAt is not null)
        {
            return false;
        }

        token.RevokedAt = DateTimeOffset.UtcNow;
        token.RevokedByIp = ipAddress;
        token.RevocationReason = reason;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);
        if (user is null || passwordHasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword) == PasswordVerificationResult.Failed || !IsPasswordValid(newPassword))
        {
            return false;
        }

        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        await RevokeUserTokensAsync(user.Id, "Password changed", ipAddress, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email.ToUpper() == email.Trim().ToUpperInvariant() && x.IsActive, cancellationToken);
        if (user is null)
        {
            return;
        }

        var rawToken = CreateRawToken();
        dbContext.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        await emailSender.SendPasswordResetAsync(user.Email, rawToken, cancellationToken);
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken)
    {
        var resetToken = await dbContext.PasswordResetTokens.FirstOrDefaultAsync(x => x.TokenHash == HashToken(token), cancellationToken);
        if (resetToken is null || resetToken.UsedAt is not null || resetToken.ExpiresAt <= DateTimeOffset.UtcNow || !IsPasswordValid(newPassword))
        {
            return false;
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == resetToken.UserId && x.IsActive, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        resetToken.UsedAt = DateTimeOffset.UtcNow;
        await RevokeUserTokensAsync(user.Id, "Password reset", null, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<UserProfileModel?> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);
        return user is null ? null : await BuildProfileAsync(user, cancellationToken);
    }

    private async Task<AuthResult> IssueTokensAsync(User user, string? ipAddress, string? userAgent, CancellationToken cancellationToken, Guid? familyId = null, string? rawRefreshToken = null)
    {
        var profile = await BuildProfileAsync(user, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(options.AccessTokenExpirationMinutes);
        var accessToken = CreateAccessToken(user, profile, expiresAt);
        var refreshToken = rawRefreshToken ?? CreateRawToken();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            FamilyId = familyId ?? Guid.NewGuid(),
            TokenHash = HashToken(refreshToken),
            ExpiresAt = now.AddDays(options.RefreshTokenExpirationDays),
            CreatedByIp = ipAddress,
            UserAgent = userAgent
        });

        return new AuthResult(accessToken, refreshToken, expiresAt, profile);
    }

    private string CreateAccessToken(User user, UserProfileModel profile, DateTimeOffset expiresAt)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new("user_id", user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };
        claims.AddRange(profile.Roles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.AddRange(profile.Permissions.Select(permission => new Claim("permission", permission)));
        if (profile.Employee is not null)
        {
            claims.Add(new Claim("branch_id", profile.Employee.BranchId.ToString()));
        }

        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SecretKey)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(options.Issuer, options.Audience, claims, expires: expiresAt.UtcDateTime, signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<UserProfileModel> BuildProfileAsync(User user, CancellationToken cancellationToken)
    {
        var roles = await (from userRole in dbContext.UserRoles
                           join role in dbContext.Roles on userRole.RoleId equals role.Id
                           where userRole.UserId == user.Id
                           select role.Name).ToListAsync(cancellationToken);
        var permissions = await (from userRole in dbContext.UserRoles
                                 join rolePermission in dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
                                 join permission in dbContext.Permissions on rolePermission.PermissionId equals permission.Id
                                 where userRole.UserId == user.Id
                                 select permission.Code).Distinct().ToListAsync(cancellationToken);
        var employee = user.EmployeeId is null
            ? null
            : await dbContext.Employees.Where(x => x.Id == user.EmployeeId).Select(x => new EmployeeProfileModel(x.Id, x.BranchId, x.EmployeeCode, x.FullName)).FirstOrDefaultAsync(cancellationToken);

        return new UserProfileModel(user.Id, user.Username, user.Email, roles, permissions, employee);
    }

    private async Task RevokeUserTokensAsync(Guid userId, string reason, string? ipAddress, CancellationToken cancellationToken)
    {
        var tokens = await dbContext.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in tokens)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
            token.RevokedByIp = ipAddress;
            token.RevocationReason = reason;
        }
    }

    private async Task RevokeFamilyAsync(Guid familyId, string reason, string? ipAddress, CancellationToken cancellationToken)
    {
        var tokens = await dbContext.RefreshTokens.Where(x => x.FamilyId == familyId && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in tokens)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
            token.RevokedByIp = ipAddress;
            token.RevocationReason = reason;
        }
    }

    private bool IsPasswordValid(string password)
    {
        var policy = passwordPolicy.Value;
        return password.Length >= policy.MinimumLength
            && (!policy.RequireUppercase || password.Any(char.IsUpper))
            && (!policy.RequireLowercase || password.Any(char.IsLower))
            && (!policy.RequireDigit || password.Any(char.IsDigit))
            && (!policy.RequireNonAlphanumeric || password.Any(ch => !char.IsLetterOrDigit(ch)));
    }

    private static string CreateRawToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }
}