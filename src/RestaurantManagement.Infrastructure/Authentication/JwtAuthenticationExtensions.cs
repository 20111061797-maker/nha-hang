using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using RestaurantManagement.Application.Common.Models;

namespace RestaurantManagement.Infrastructure.Authentication;

public static class JwtAuthenticationExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) || jwtOptions.SecretKey.Length < 32)
        {
            var envSecret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                ?? Environment.GetEnvironmentVariable("JWT__SECRETKEY");

            if (!string.IsNullOrWhiteSpace(envSecret) && envSecret.Length >= 32)
            {
                jwtOptions.SecretKey = envSecret;
            }
            else
            {
                // Fallback default secure key for easy cloud preview deployment
                jwtOptions.SecretKey = "RestaurantManagementProductionFallbackSecretKey2026!@#$%^&*";
            }
        }

        if (string.IsNullOrWhiteSpace(jwtOptions.Issuer))
        {
            jwtOptions.Issuer = "RestaurantManagement";
        }
        if (string.IsNullOrWhiteSpace(jwtOptions.Audience))
        {
            jwtOptions.Audience = "RestaurantManagement.Client";
        }

        services.Configure<JwtOptions>(opt =>
        {
            opt.SecretKey = jwtOptions.SecretKey;
            opt.Issuer = jwtOptions.Issuer;
            opt.Audience = jwtOptions.Audience;
            opt.AccessTokenExpirationMinutes = jwtOptions.AccessTokenExpirationMinutes > 0 ? jwtOptions.AccessTokenExpirationMinutes : 60;
            opt.RefreshTokenExpirationDays = jwtOptions.RefreshTokenExpirationDays > 0 ? jwtOptions.RefreshTokenExpirationDays : 30;
        });
        services.Configure<PasswordPolicyOptions>(configuration.GetSection(PasswordPolicyOptions.SectionName));
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        return services;
    }
}