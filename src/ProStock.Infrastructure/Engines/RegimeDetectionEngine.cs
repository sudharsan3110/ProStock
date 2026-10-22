using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Engines;

public class RegimeDetectionEngine : IRegimeDetectionEngine
{
    private readonly ITechnicalIndicatorEngine _indicators;

    public RegimeDetectionEngine(ITechnicalIndicatorEngine indicators)
    {
        _indicators = indicators;
    }

    public RegimeType DetectRegime(Candle[] candles)
    {
        if (candles.Length < 30) return RegimeType.Ranging;

        var closes = candles.Select(c => c.Close).ToArray();
        var ema20 = _indicators.CalculateEma(closes, 20);
        var ema50 = _indicators.CalculateEma(closes, 50);
        var atr = _indicators.CalculateAtr(candles, 14);
        var (_, _, _, bandwidth) = _indicators.CalculateBollingerBands(closes, 20);

        int lastIdx = candles.Length - 1;
        int prevIdx = candles.Length - 5;

        decimal currentPrice = closes[lastIdx];
        decimal currentEma20 = ema20[lastIdx];
        decimal currentEma50 = ema50[lastIdx];

        decimal ema20Slope = (currentEma20 - ema20[prevIdx]) / ema20[prevIdx] * 100;
        decimal currentBandwidth = bandwidth[lastIdx];
        decimal avgBandwidth = bandwidth.TakeLast(20).Average();

        decimal currentAtr = atr[lastIdx];
        decimal avgAtr = atr.TakeLast(20).Average();

        // 1. Volatility Expansion Check
        if (currentAtr > avgAtr * 1.5m && currentBandwidth > avgBandwidth * 1.4m)
        {
            return RegimeType.VolatilityExpansion;
        }

        // 2. Volatility Compression Check (Squeeze)
        if (currentBandwidth < avgBandwidth * 0.7m && currentAtr < avgAtr * 0.8m)
        {
            return RegimeType.VolatilityCompression;
        }

        // 3. Trending Bull Check
        if (currentPrice > currentEma20 && currentEma20 > currentEma50 && ema20Slope > 0.15m)
        {
            return RegimeType.TrendingBull;
        }

        // 4. Trending Bear Check
        if (currentPrice < currentEma20 && currentEma20 < currentEma50 && ema20Slope < -0.15m)
        {
            return RegimeType.TrendingBear;
        }

        // 5. Default to Ranging
        return RegimeType.Ranging;
    }
}
