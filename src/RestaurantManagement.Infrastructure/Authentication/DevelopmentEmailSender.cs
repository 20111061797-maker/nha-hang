using Microsoft.Extensions.Logging;
using RestaurantManagement.Application.Common.Interfaces;

namespace RestaurantManagement.Infrastructure.Authentication;

public sealed class DevelopmentEmailSender(ILogger<DevelopmentEmailSender> logger) : IEmailSender
{
    public Task SendPasswordResetAsync(string email, string resetToken, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Password reset requested for account email {Email}; email delivery is not configured.", email);
        return Task.CompletedTask;
    }
}