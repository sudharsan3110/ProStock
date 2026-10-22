using Microsoft.EntityFrameworkCore;
using ProStock.Domain.Entities;

namespace ProStock.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Instrument> Instruments { get; }
    DbSet<Candle> Candles { get; }
    DbSet<MarketTick> MarketTicks { get; }
    DbSet<Signal> Signals { get; }
    DbSet<StrategyDefinition> Strategies { get; }
    DbSet<PaperAccount> PaperAccounts { get; }
    DbSet<PaperOrder> PaperOrders { get; }
    DbSet<PaperPosition> PaperPositions { get; }
    DbSet<PaperTrade> PaperTrades { get; }
    DbSet<BacktestRun> BacktestRuns { get; }
    DbSet<SystemHealthRecord> HealthRecords { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
