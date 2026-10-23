using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.MarketData;

public record BinanceSymbolInfo(
    string Symbol,
    string BaseAsset,
    string QuoteAsset,
    decimal TickSize,
    decimal StepSize);

/// <summary>Rolling 24h statistics — from REST /ticker/24hr or the &lt;symbol&gt;@ticker stream.</summary>
public record Binance24hTicker(
    string Symbol,
    decimal LastPrice,
    decimal PriceChange,
    decimal PriceChangePercent,
    decimal WeightedAvgPrice,
    decimal OpenPrice,
    decimal HighPrice,
    decimal LowPrice,
    decimal Volume,
    decimal QuoteVolume,
    decimal BidPrice,
    decimal AskPrice,
    DateTime EventTimeUtc);

public record BinanceKline(
    DateTime OpenTimeUtc,
    DateTime CloseTimeUtc,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    decimal Volume,
    decimal QuoteVolume,
    bool IsClosed);

public abstract record BinanceStreamMessage(string Symbol, DateTime EventTimeUtc);

public record BinanceTickerMessage(Binance24hTicker Ticker)
    : BinanceStreamMessage(Ticker.Symbol, Ticker.EventTimeUtc);

public record BinanceKlineMessage(string Symbol, string Interval, BinanceKline Kline, DateTime EventTime)
    : BinanceStreamMessage(Symbol, EventTime);

public static class BinanceIntervals
{
    public const string Signal = "15m";

    public static string FromTimeframe(Timeframe tf) => tf switch
    {
        Timeframe.M1 => "1m",
        Timeframe.M5 => "5m",
        Timeframe.M15 => "15m",
        Timeframe.H1 => "1h",
        Timeframe.H4 => "4h",
        Timeframe.D1 => "1d",
        _ => "15m"
    };

    /// <summary>Maps the UI's timeframe labels ("1m", "15m", "1h", "1D", ...) to Binance intervals.</summary>
    public static string? FromLabel(string? label) => label switch
    {
        "1m" => "1m",
        "5m" => "5m",
        "15m" => "15m",
        "1h" => "1h",
        "4h" => "4h",
        "1D" or "1d" => "1d",
        "1W" or "1w" => "1w",
        _ => null
    };
}
