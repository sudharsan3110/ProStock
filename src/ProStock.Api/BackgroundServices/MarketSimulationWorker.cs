using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProStock.Api.Contracts;
using ProStock.Api.Hubs;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Api.BackgroundServices;

public class MarketSimulationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<MarketHub> _marketHub;
    private readonly IHubContext<SignalHub> _signalHub;
    private readonly ILogger<MarketSimulationWorker> _logger;

    public MarketSimulationWorker(
        IServiceProvider serviceProvider,
        IHubContext<MarketHub> marketHub,
        IHubContext<SignalHub> signalHub,
        ILogger<MarketSimulationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _marketHub = marketHub;
        _signalHub = signalHub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MarketSimulationWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var paperBroker = scope.ServiceProvider.GetRequiredService<IPaperBroker>();

                // Crypto instruments carry live Binance data (BinanceMarketDataWorker); only
                // markets without a connected feed are simulated here.
                var instruments = await context.Instruments
                    .Where(i => i.Market != MarketExchange.Binance)
                    .Take(10)
                    .ToListAsync(stoppingToken);

                var now = DateTime.UtcNow;
                foreach (var inst in instruments)
                {
                    // Simulated real-time tick micro-fluctuation around the session's reference price
                    decimal referencePrice = inst.Price - inst.Change;
                    decimal delta = (decimal)(Random.Shared.NextDouble() - 0.49) * (inst.Price * 0.0008m);
                    inst.Price = Math.Round(inst.Price + delta, 2);
                    inst.Change = inst.Price - referencePrice;
                    inst.ChangePercent = referencePrice != 0 ? Math.Round((inst.Change / referencePrice) * 100, 2) : 0;
                    inst.High = Math.Max(inst.High, inst.Price);
                    inst.Low = Math.Min(inst.Low, inst.Price);
                    inst.Volume += Random.Shared.Next(100, 2500);

                    // Process tick through paper broker for fills & SL/TP tracking
                    await paperBroker.ProcessTickAsync(inst.Symbol, inst.Price, stoppingToken);

                    // Broadcast live tick to SignalR clients
                    await _marketHub.Clients.All.SendAsync("TickUpdate", ApiMappers.ToTickerDto(inst, now), stoppingToken);
                }

                await context.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MarketSimulationWorker iteration.");
            }

            // Conflate updates to every 2 seconds
            await Task.Delay(2000, stoppingToken);
        }
    }
}
