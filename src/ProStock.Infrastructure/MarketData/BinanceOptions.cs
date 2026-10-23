using Microsoft.Extensions.Configuration;

namespace ProStock.Infrastructure.MarketData;

public sealed class BinanceOptions
{
    public bool Enabled { get; init; } = true;

    /// <summary>
    /// Spot REST base. api.binance.com is geo-blocked in some regions (HTTP 451);
    /// https://data-api.binance.vision serves the same public market data.
    /// </summary>
    public string RestBaseUrl { get; init; } = "https://api.binance.com";

    public string StreamBaseUrl { get; init; } = "wss://stream.binance.com:9443";

    public IReadOnlyList<string> Symbols { get; init; } = new[] { "BTCUSDT", "ETHUSDT", "SOLUSDT" };

    /// <summary>Number of 15m candles to backfill on startup (≈5 days, enough for EMA50 and RVOL).</summary>
    public int BackfillCandles { get; init; } = 500;

    public static BinanceOptions FromConfiguration(IConfiguration config)
    {
        var symbols = (config["PROSTOCK_BINANCE_SYMBOLS"] ?? "BTCUSDT,ETHUSDT,SOLUSDT")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.ToUpperInvariant())
            .Distinct()
            .ToArray();

        return new BinanceOptions
        {
            Enabled = !string.Equals(config["PROSTOCK_BINANCE_ENABLED"], "false", StringComparison.OrdinalIgnoreCase),
            RestBaseUrl = (config["PROSTOCK_BINANCE_REST_URL"] ?? "https://api.binance.com").TrimEnd('/'),
            StreamBaseUrl = (config["PROSTOCK_BINANCE_STREAM_URL"] ?? "wss://stream.binance.com:9443").TrimEnd('/'),
            Symbols = symbols,
            BackfillCandles = int.TryParse(config["PROSTOCK_BINANCE_BACKFILL_CANDLES"], out var n) ? Math.Clamp(n, 60, 1000) : 500
        };
    }

    public bool IsTracked(string symbol) =>
        Symbols.Contains(symbol, StringComparer.OrdinalIgnoreCase);
}
