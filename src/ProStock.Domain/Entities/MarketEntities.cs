using ProStock.Domain.Enums;

namespace ProStock.Domain.Entities;

public class Instrument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Exchange { get; set; } = "NSE";
    public MarketExchange Market { get; set; } = MarketExchange.NSE;
    public string Sector { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Change { get; set; }
    public decimal ChangePercent { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public long Volume { get; set; }
    public long AvgVolume { get; set; }
    public decimal RelativeVolume { get; set; } = 1.0m;
    public decimal Vwap { get; set; }
    public decimal Atr { get; set; }
    public RegimeType Regime { get; set; } = RegimeType.TrendingBull;
    public decimal Score { get; set; }
    public FreshnessState Freshness { get; set; } = FreshnessState.Live;
    public int LotSize { get; set; } = 1;
    public decimal TickSize { get; set; } = 0.05m;
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Candle
{
    public long Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public Timeframe Timeframe { get; set; } = Timeframe.M15;
    public DateTime Timestamp { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long Volume { get; set; }
    public decimal? Vwap { get; set; }
}

public class MarketTick
{
    public long Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public long Volume { get; set; }
    public OrderSide Side { get; set; } = OrderSide.Buy;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
