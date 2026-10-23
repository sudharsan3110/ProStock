using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.MarketData;

public record CryptoAnalyticsResult(
    decimal Atr,
    RegimeType Regime,
    decimal AvgDailyVolume)
{
    /// <summary>RVOL: rolling 24h volume against the mean of the last 20 completed daily sessions.</summary>
    public decimal RelativeVolume(decimal rolling24hVolume) =>
        AvgDailyVolume > 0 ? Math.Round(rolling24hVolume / AvgDailyVolume, 2) : 1.0m;
}

/// <summary>Derives the per-instrument analytics the terminal displays from real Binance data.</summary>
public sealed class CryptoMarketAnalytics
{
    private readonly ITechnicalIndicatorEngine _indicators;
    private readonly IRegimeDetectionEngine _regime;

    public CryptoMarketAnalytics(ITechnicalIndicatorEngine indicators, IRegimeDetectionEngine regime)
    {
        _indicators = indicators;
        _regime = regime;
    }

    /// <param name="candles15m">Closed 15m candles, oldest first.</param>
    /// <param name="dailyKlines">Daily klines, oldest first; the last one may be the in-progress day.</param>
    public CryptoAnalyticsResult Compute(
        IReadOnlyList<Candle> candles15m,
        IReadOnlyList<BinanceKline> dailyKlines)
    {
        var window = candles15m.TakeLast(200).ToArray();

        decimal atr = 0;
        if (window.Length > 0)
        {
            atr = Math.Round(_indicators.CalculateAtr(window, 14)[^1], 4);
        }

        var regime = _regime.DetectRegime(window);

        var completedDays = dailyKlines.Where(k => k.IsClosed).TakeLast(20).ToList();
        decimal avgDaily = completedDays.Count > 0 ? completedDays.Average(k => k.Volume) : 0;

        return new CryptoAnalyticsResult(atr, regime, avgDaily);
    }

    public static Candle ToCandle(string symbol, BinanceKline k) => new()
    {
        Symbol = symbol,
        Timeframe = Timeframe.M15,
        Timestamp = k.OpenTimeUtc,
        Open = k.Open,
        High = k.High,
        Low = k.Low,
        Close = k.Close,
        // Candle.Volume is an integer column; sub-unit volume (e.g. 0.4 BTC) is rounded.
        Volume = (long)Math.Round(k.Volume),
        Vwap = k.Volume > 0 ? Math.Round(k.QuoteVolume / k.Volume, 4) : k.Close
    };

    /// <summary>
    /// Cumulative VWAP per bar, reset at each UTC midnight for intraday intervals —
    /// crypto trades 24/7, so the UTC day is the session.
    /// </summary>
    public static decimal[] SessionVwap(IReadOnlyList<BinanceKline> klines, bool resetDaily)
    {
        var result = new decimal[klines.Count];
        decimal cumQuote = 0, cumVol = 0;
        DateTime? session = null;

        for (int i = 0; i < klines.Count; i++)
        {
            var k = klines[i];
            if (resetDaily && session != k.OpenTimeUtc.Date)
            {
                session = k.OpenTimeUtc.Date;
                cumQuote = 0;
                cumVol = 0;
            }

            cumQuote += k.QuoteVolume;
            cumVol += k.Volume;
            result[i] = cumVol > 0 ? cumQuote / cumVol : k.Close;
        }

        return result;
    }

    public static string DisplayName(BinanceSymbolInfo info)
    {
        var name = info.BaseAsset switch
        {
            "BTC" => "Bitcoin",
            "ETH" => "Ethereum",
            "SOL" => "Solana",
            "BNB" => "BNB",
            "XRP" => "XRP",
            _ => info.BaseAsset
        };
        return $"{name} / {info.QuoteAsset}";
    }
}
