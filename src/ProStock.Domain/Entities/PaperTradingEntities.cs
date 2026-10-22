using ProStock.Domain.Enums;

namespace ProStock.Domain.Entities;

public class PaperAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string AccountNumber { get; set; } = "PAPER-IN-001";
    public string Currency { get; set; } = "INR";
    public decimal TotalEquity { get; set; } = 1000000m;
    public decimal CashBalance { get; set; } = 1000000m;
    public decimal MarginUsed { get; set; }
    public decimal MarginAvailable => Math.Max(0, TotalEquity - MarginUsed);
    public decimal DailyPnL { get; set; }
    public decimal DailyPnLPercent { get; set; }
    public decimal UnrealizedPnL { get; set; }
    public decimal RealizedPnL { get; set; }
    public decimal PortfolioHeatPercent { get; set; }
    public decimal MaxAllowedHeatPercent { get; set; } = 30.0m;
    public bool CircuitBreakerTripped { get; set; }
    public string? TrippedReason { get; set; }
    public DateTime LastResetAt { get; set; } = DateTime.UtcNow;

    public ICollection<PaperOrder> Orders { get; set; } = new List<PaperOrder>();
    public ICollection<PaperPosition> Positions { get; set; } = new List<PaperPosition>();
    public ICollection<PaperTrade> Trades { get; set; } = new List<PaperTrade>();
}

public class PaperOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PaperAccountId { get; set; }
    public PaperAccount? Account { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public OrderSide Side { get; set; } = OrderSide.Buy;
    public OrderType Type { get; set; } = OrderType.Market;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal? StopLossPrice { get; set; }
    public decimal? TargetPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public int FilledQuantity { get; set; }
    public decimal AverageFillPrice { get; set; }
    public decimal SlippageAmount { get; set; }
    public decimal BrokerageFee { get; set; }
    public decimal TaxesAndCharges { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? FilledAt { get; set; }
}

public class PaperPosition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PaperAccountId { get; set; }
    public PaperAccount? Account { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public Direction Direction { get; set; } = Direction.Long;
    public int Quantity { get; set; }
    public decimal AvgEntryPrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal MarketValue => Quantity * CurrentPrice;
    public decimal UnrealizedPnL => Direction == Direction.Long
        ? (CurrentPrice - AvgEntryPrice) * Quantity
        : (AvgEntryPrice - CurrentPrice) * Quantity;
    public decimal UnrealizedPnLPercent => AvgEntryPrice > 0 ? (UnrealizedPnL / (AvgEntryPrice * Quantity)) * 100 : 0;
    public decimal StopLoss { get; set; }
    public decimal TargetPrice { get; set; }
    public decimal RMultiple { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
}

public class PaperTrade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PaperAccountId { get; set; }
    public PaperAccount? Account { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public Direction Direction { get; set; } = Direction.Long;
    public int Quantity { get; set; }
    public decimal EntryPrice { get; set; }
    public decimal ExitPrice { get; set; }
    public decimal GrossPnL { get; set; }
    public decimal NetPnL { get; set; }
    public decimal TotalTaxesAndFees { get; set; }
    public string ExitReason { get; set; } = "TARGET_HIT";
    public DateTime EntryTime { get; set; }
    public DateTime ExitTime { get; set; } = DateTime.UtcNow;
}

public class BacktestRun
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string StrategyName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string Symbol { get; set; } = "NIFTY";
    public string TestPeriod { get; set; } = "2024-2026";
    public decimal InitialCapital { get; set; } = 1000000m;
    public decimal FinalEquity { get; set; }
    public decimal CAGR { get; set; }
    public decimal MaxDrawdown { get; set; }
    public decimal SharpeRatio { get; set; }
    public decimal SortinoRatio { get; set; }
    public decimal ProfitFactor { get; set; }
    public decimal WinRate { get; set; }
    public int TotalTrades { get; set; }
    public int WinningTrades { get; set; }
    public int LosingTrades { get; set; }
    public decimal ExpectancyR { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}

public class SystemHealthRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Status { get; set; } = "OPTIMAL";
    public string Uptime { get; set; } = "14d 8h 22m";
    public decimal AggregationDelayMs { get; set; } = 12.4m;
    public decimal SignalEvaluationMs { get; set; } = 3.8m;
    public decimal DbWriteLatencyMs { get; set; } = 4.2m;
    public int DroppedTicks { get; set; }
    public int ActiveSubscribers { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
