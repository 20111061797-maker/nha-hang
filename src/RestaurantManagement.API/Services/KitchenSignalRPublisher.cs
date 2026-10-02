using Microsoft.AspNetCore.SignalR;
using RestaurantManagement.API.Hubs;
using RestaurantManagement.Application.Features.Kitchen;

namespace RestaurantManagement.API.Services;

public sealed class KitchenSignalRPublisher(IHubContext<KitchenHub> hubContext) : IKitchenEventPublisher
{
    public Task PublishAsync(KitchenEvent kitchenEvent, CancellationToken cancellationToken) => hubContext.Clients.Group($"branch:{kitchenEvent.BranchId}").SendAsync(kitchenEvent.EventName, kitchenEvent, cancellationToken);
}