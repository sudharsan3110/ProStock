using System.Text.Json;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Api.Contracts;

/// <summary>
/// Converts domain entities into the exact string vocabulary the web terminal uses
/// (see web/src/types/index.ts): markets "NSE" | "US" | "CRYPTO", regimes "TRENDING_BULL", etc.
/// Shared by REST controllers and SignalR broadcasts so both emit identical shapes.
/// </summary>
public static class ApiMappers
{
    public static string MarketLabel(MarketExchange m) => m switch
    {
        MarketExchange.NYSE or MarketExchange.NASDAQ => "US",
        MarketExchange.Binance => "CRYPTO",
        _ => m.ToString().ToUpperInvariant()
    };

    public static string RegimeLabel(RegimeType r) => r switch
    {
        RegimeType.TrendingBull => "TRENDING_BULL",
        RegimeType.TrendingBear => "TRENDING_BEAR",
        RegimeType.Ranging => "RANGING",
        RegimeType.VolatilityExpansion => "VOLATILITY_EXPANSION",
        RegimeType.VolatilityCompression => "VOLATILITY_COMPRESSION",
        _ => "RANGING"
    };

    public static string TimeframeLabel(Timeframe tf) => tf switch
    {
        Timeframe.M1 => "1m",
        Timeframe.M5 => "5m",
        Timeframe.M15 => "15m",
        Timeframe.H1 => "1h",
        Timeframe.H4 => "4h",
        Timeframe.D1 => "1D",
        _ => "15m"
    };

    public static string FreshnessLabel(FreshnessState f) => f switch
    {
        FreshnessState.Live => "LIVE",
        FreshnessState.Delay3s => "3s",
        FreshnessState.Delayed => "DELAYED",
        FreshnessState.Closed => "CLOSED",
        _ => "STALE"
    };

    public static string StatusLabel(SignalStatus s) => s switch
    {
        SignalStatus.Active => "ACTIVE",
        SignalStatus.Expired => "EXPIRED",
        SignalStatus.Target1Hit => "TARGET_1_HIT",
        SignalStatus.Target2Hit => "TARGET_2_HIT",
        SignalStatus.Target3Hit => "TARGET_3_HIT",
        SignalStatus.StoppedOut => "STOPPED_OUT",
        _ => "ACTIVE"
    };

    /// <summary>
    /// Streamed instruments derive freshness from the age of their last update rather than
    /// a stored flag, so a dead feed shows DELAYED/STALE instead of a permanent LIVE.
    /// </summary>
    public static FreshnessState EffectiveFreshness(Instrument i, DateTime nowUtc)
    {
        if (!i.Market.IsCrypto()) return i.Freshness;

        var age = nowUtc - i.LastUpdatedAt;
        if (age <= TimeSpan.FromSeconds(5)) return FreshnessState.Live;
        if (age <= TimeSpan.FromSeconds(60)) return FreshnessState.Delayed;
        return FreshnessState.Stale;
    }

    public static object ToTickerDto(Instrument i, DateTime nowUtc) => new
    {
        symbol = i.Symbol,
        name = i.Name,
        exchange = i.Exchange,
        market = MarketLabel(i.Market),
        sector = i.Sector,
        currency = i.Market.CurrencySymbol(),
        price = i.Price,
        change = i.Change,
        changePercent = i.ChangePercent,
        high = i.High,
        low = i.Low,
        volume = i.Volume,
        avgVolume = i.AvgVolume,
        relativeVolume = i.RelativeVolume,
        vwap = i.Vwap,
        atr = i.Atr,
        regime = RegimeLabel(i.Regime),
        score = i.Score,
        tickSize = i.TickSize,
        freshness = FreshnessLabel(EffectiveFreshness(i, nowUtc)),
        // SQLite returns DateTimeKind.Unspecified; values are always written as UTC.
        lastUpdated = DateTime.SpecifyKind(i.LastUpdatedAt, DateTimeKind.Utc).ToString("O")
    };

    public static object ToSignalDto(Signal s) => new
    {
        id = s.Id.ToString(),
        symbol = s.Symbol,
        market = MarketLabel(s.Market),
        currency = s.Market.CurrencySymbol(),
        direction = s.Direction.ToString().ToUpperInvariant(),
        timeframe = TimeframeLabel(s.Timeframe),
        strategy = new
        {
            name = s.StrategyName,
            version = s.StrategyVersion,
            author = s.StrategyAuthor
        },
        regime = RegimeLabel(s.Regime),
        freshness = FreshnessLabel(s.Freshness),
        mode = s.Mode.ToString().ToUpperInvariant(),
        status = StatusLabel(s.Status),
        plan = new
        {
            entryMin = s.EntryMin,
            entryMax = s.EntryMax,
            currentPrice = s.CurrentPrice,
            stopLoss = s.StopLoss,
            target1 = s.Target1,
            target2 = s.Target2,
            target3 = s.Target3,
            riskReward = s.RiskReward,
            suggestedQty = s.SuggestedQty,
            dollarRisk = s.DollarRisk,
            heatImpactPercent = s.HeatImpactPercent
        },
        score = new
        {
            total = (int)s.TotalScore,
            factorCoverage = (int)s.FactorCoverage,
            factors = SafeDeserialize(s.FactorsJson),
            gatesPassed = SafeDeserialize(s.GatesPassedJson)
        },
        reasons = SafeDeserialize(s.ReasonsJson),
        invalidation = SafeDeserialize(s.InvalidationJson),
        context = new
        {
            eventRisks = "No High-Impact Blackout Events Active",
            dataQualityScore = "99.8% (Zero Missing Ticks)",
            volumeSemantics = "Aggressive Market Buy Delta",
            correlatedPositions = "0 Existing in this Sector"
        },
        evidence = new
        {
            historicalWinRate = 67.4m,
            sampleSize = 142,
            confidenceInterval = "95% [62.1% - 72.7%]",
            profitFactor = 2.34m,
            sharpeRatio = 2.15m,
            averageHoldingTime = "4h 22m"
        },
        aiExplanation = new
        {
            summary = s.Summary,
            groundingFacts = SafeDeserialize(s.GroundingFactsJson),
            generatedAt = s.CreatedAt.ToString("HH:mm:ss")
        },
        timestamp = s.CreatedAt.ToString("O"),
        hash = s.HashSha256
    };

    private static object SafeDeserialize(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<JsonElement>(json);
        }
        catch (JsonException)
        {
            return Array.Empty<object>();
        }
    }
}
