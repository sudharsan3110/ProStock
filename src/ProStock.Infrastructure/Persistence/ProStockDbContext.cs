using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces;
using ProStock.Domain.Entities;

namespace ProStock.Infrastructure.Persistence;

public class ProStockDbContext : DbContext, IApplicationDbContext
{
    public ProStockDbContext(DbContextOptions<ProStockDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Instrument> Instruments => Set<Instrument>();
    public DbSet<Candle> Candles => Set<Candle>();
    public DbSet<MarketTick> MarketTicks => Set<MarketTick>();
    public DbSet<Signal> Signals => Set<Signal>();
    public DbSet<StrategyDefinition> Strategies => Set<StrategyDefinition>();
    public DbSet<PaperAccount> PaperAccounts => Set<PaperAccount>();
    public DbSet<PaperOrder> PaperOrders => Set<PaperOrder>();
    public DbSet<PaperPosition> PaperPositions => Set<PaperPosition>();
    public DbSet<PaperTrade> PaperTrades => Set<PaperTrade>();
    public DbSet<BacktestRun> BacktestRuns => Set<BacktestRun>();
    public DbSet<SystemHealthRecord> HealthRecords => Set<SystemHealthRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User & Auth
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256).IsRequired();
            entity.Property(u => u.FullName).HasMaxLength(256);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.HasIndex(rt => rt.Token).IsUnique();
            entity.HasOne(rt => rt.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Instrument & Candles
        modelBuilder.Entity<Instrument>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.HasIndex(i => i.Symbol).IsUnique();
            entity.Property(i => i.Price).HasPrecision(18, 4);
            entity.Property(i => i.Change).HasPrecision(18, 4);
            entity.Property(i => i.High).HasPrecision(18, 4);
            entity.Property(i => i.Low).HasPrecision(18, 4);
            entity.Property(i => i.Vwap).HasPrecision(18, 4);
            entity.Property(i => i.Atr).HasPrecision(18, 4);
        });

        modelBuilder.Entity<Candle>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => new { c.Symbol, c.Timeframe, c.Timestamp });
            entity.Property(c => c.Open).HasPrecision(18, 4);
            entity.Property(c => c.High).HasPrecision(18, 4);
            entity.Property(c => c.Low).HasPrecision(18, 4);
            entity.Property(c => c.Close).HasPrecision(18, 4);
            entity.Property(c => c.Vwap).HasPrecision(18, 4);
        });

        modelBuilder.Entity<MarketTick>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => new { t.Symbol, t.Timestamp });
            entity.Property(t => t.Price).HasPrecision(18, 4);
        });

        // Signals
        modelBuilder.Entity<Signal>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => s.Symbol);
            entity.HasIndex(s => s.CreatedAt);
            entity.Property(s => s.EntryMin).HasPrecision(18, 4);
            entity.Property(s => s.EntryMax).HasPrecision(18, 4);
            entity.Property(s => s.CurrentPrice).HasPrecision(18, 4);
            entity.Property(s => s.StopLoss).HasPrecision(18, 4);
            entity.Property(s => s.Target1).HasPrecision(18, 4);
            entity.Property(s => s.Target2).HasPrecision(18, 4);
            entity.Property(s => s.Target3).HasPrecision(18, 4);
            entity.Property(s => s.DollarRisk).HasPrecision(18, 2);
        });

        // Paper Accounts & Orders
        modelBuilder.Entity<PaperAccount>(entity =>
        {
            entity.HasKey(pa => pa.Id);
            entity.HasIndex(pa => pa.AccountNumber).IsUnique();
            entity.Property(pa => pa.TotalEquity).HasPrecision(18, 2);
            entity.Property(pa => pa.CashBalance).HasPrecision(18, 2);
            entity.Property(pa => pa.MarginUsed).HasPrecision(18, 2);
            entity.Property(pa => pa.DailyPnL).HasPrecision(18, 2);
            entity.Property(pa => pa.RealizedPnL).HasPrecision(18, 2);
            entity.Property(pa => pa.UnrealizedPnL).HasPrecision(18, 2);

            entity.HasOne(pa => pa.User)
                  .WithMany(u => u.PaperAccounts)
                  .HasForeignKey(pa => pa.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PaperOrder>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Price).HasPrecision(18, 4);
            entity.Property(o => o.AverageFillPrice).HasPrecision(18, 4);
            entity.Property(o => o.SlippageAmount).HasPrecision(18, 4);
            entity.Property(o => o.BrokerageFee).HasPrecision(18, 2);
            entity.Property(o => o.TaxesAndCharges).HasPrecision(18, 2);

            entity.HasOne(o => o.Account)
                  .WithMany(a => a.Orders)
                  .HasForeignKey(o => o.PaperAccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PaperPosition>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.AvgEntryPrice).HasPrecision(18, 4);
            entity.Property(p => p.CurrentPrice).HasPrecision(18, 4);
            entity.Property(p => p.StopLoss).HasPrecision(18, 4);
            entity.Property(p => p.TargetPrice).HasPrecision(18, 4);

            entity.HasOne(p => p.Account)
                  .WithMany(a => a.Positions)
                  .HasForeignKey(p => p.PaperAccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PaperTrade>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.EntryPrice).HasPrecision(18, 4);
            entity.Property(t => t.ExitPrice).HasPrecision(18, 4);
            entity.Property(t => t.GrossPnL).HasPrecision(18, 2);
            entity.Property(t => t.NetPnL).HasPrecision(18, 2);
            entity.Property(t => t.TotalTaxesAndFees).HasPrecision(18, 2);

            entity.HasOne(t => t.Account)
                  .WithMany(a => a.Trades)
                  .HasForeignKey(t => t.PaperAccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
