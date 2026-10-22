using ProStock.Domain.Enums;

namespace ProStock.Domain.Entities;

public class Signal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Symbol { get; set; } = string.Empty;
    public MarketExchange Market { get; set; } = MarketExchange.NSE;
    public Direction Direction { get; set; } = Direction.Long;
    public Timeframe Timeframe { get; set; } = Timeframe.M15;
    
    public string StrategyName { get; set; } = string.Empty;
    public string StrategyVersion { get; set; } = "1.0.0";
    public string StrategyAuthor { get; set; } = "ProStock System";

    public RegimeType Regime { get; set; } = RegimeType.TrendingBull;
    public FreshnessState Freshness { get; set; } = FreshnessState.Live;
    public SignalMode Mode { get; set; } = SignalMode.Live;
    public SignalStatus Status { get; set; } = SignalStatus.Active;

    // Execution Plan
    public decimal EntryMin { get; set; }
    public decimal EntryMax { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal StopLoss { get; set; }
    public decimal Target1 { get; set; }
    public decimal Target2 { get; set; }
    public decimal Target3 { get; set; }
    public decimal RiskReward { get; set; }
    public int SuggestedQty { get; set; }
    public decimal DollarRisk { get; set; }
    public decimal HeatImpactPercent { get; set; }

    // Scoring & Audit
    public decimal TotalScore { get; set; }
    public decimal FactorCoverage { get; set; } = 100m;
    public string FactorsJson { get; set; } = "[]";
    public string GatesPassedJson { get; set; } = "[]";
    public string ReasonsJson { get; set; } = "[]";
    public string InvalidationJson { get; set; } = "[]";

    // AI Explanation & Context
    public string Summary { get; set; } = string.Empty;
    public string GroundingFactsJson { get; set; } = "[]";
    public string HashSha256 { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
}

public class StrategyDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public StrategyState State { get; set; } = StrategyState.Active;
    public string Author { get; set; } = "ProStock Quant";
    public string Description { get; set; } = string.Empty;
    public decimal WinRate { get; set; }
    public decimal Sharpe { get; set; }
    public int SignalsLast30d { get; set; }
    public string DecayRisk { get; set; } = "LOW";
    public DateTime PromotedAt { get; set; } = DateTime.UtcNow;
}
