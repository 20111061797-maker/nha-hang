using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RestaurantManagement.Application.Common.Interfaces;

namespace RestaurantManagement.API.Hubs;

[Authorize]
public sealed class KitchenHub(ICurrentUserService currentUser) : Hub
{
    public async Task JoinBranch(Guid branchId)
    {
        if (!currentUser.IsAdministrator && currentUser.BranchId != branchId) throw new HubException("You do not have access to this branch.");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"branch:{branchId}");
    }

    public Task LeaveBranch(Guid branchId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"branch:{branchId}");
}