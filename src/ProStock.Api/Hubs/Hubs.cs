using Microsoft.AspNetCore.SignalR;

namespace ProStock.Api.Hubs;

public class MarketHub : Hub
{
    public async Task JoinSymbolGroup(string symbol)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"symbol_{symbol.ToUpper()}");
    }

    public async Task LeaveSymbolGroup(string symbol)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"symbol_{symbol.ToUpper()}");
    }
}

public class SignalHub : Hub
{
    public async Task JoinMarketGroup(string market)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"market_{market.ToUpper()}");
    }
}
