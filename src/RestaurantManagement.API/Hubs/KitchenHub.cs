using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RestaurantManagement.Application.Common.Interfaces;

namespace RestaurantManagement.API.Hubs;

[Authorize]
public sealed class KitchenHub(ICurrentUserService currentUser) : Hub
{
    public async Task JoinBranch(Guid branchId)
    {
        if (currentUser.IsAdministrator ||
            currentUser.Roles.Contains("Admin") ||
            currentUser.Roles.Contains("Owner") ||
            currentUser.Roles.Contains("Manager") ||
            currentUser.Roles.Contains("Cashier") ||
            currentUser.Roles.Contains("Kitchen") ||
            currentUser.Roles.Contains("Waiter") ||
            currentUser.BranchId == branchId ||
            currentUser.BranchId == null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"branch:{branchId}");
            return;
        }

        throw new HubException("You do not have access to this branch.");
    }

    public Task LeaveBranch(Guid branchId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"branch:{branchId}");
}