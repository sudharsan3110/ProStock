using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;

namespace ProStock.Infrastructure.Engines;

public class TechnicalIndicatorEngine : ITechnicalIndicatorEngine
{
    public decimal[] CalculateSma(decimal[] prices, int period)
    {
        if (prices.Length == 0 || period <= 0) return Array.Empty<decimal>();
        var result = new decimal[prices.Length];

        decimal sum = 0;
        for (int i = 0; i < prices.Length; i++)
        {
            sum += prices[i];
            if (i >= period)
            {
                sum -= prices[i - period];
            }

            if (i >= period - 1)
            {
                result[i] = sum / period;
            }
            else
            {
                result[i] = prices[i]; // Warmup fallback
            }
        }

        return result;
    }

    public decimal[] CalculateEma(decimal[] prices, int period)
    {
        if (prices.Length == 0 || period <= 0) return Array.Empty<decimal>();
        var result = new decimal[prices.Length];
        decimal multiplier = 2.0m / (period + 1.0m);

        // Start with SMA for first 'period' bars
        decimal sum = 0;
        for (int i = 0; i < Math.Min(period, prices.Length); i++)
        {
            sum += prices[i];
            result[i] = sum / (i + 1);
        }

        for (int i = period; i < prices.Length; i++)
        {
            result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
        }

        return result;
    }

    public decimal[] CalculateRsi(decimal[] prices, int period = 14)
    {
        if (prices.Length < period + 1) return new decimal[prices.Length];
        var result = new decimal[prices.Length];

        decimal gainSum = 0;
        decimal lossSum = 0;

        for (int i = 1; i <= period; i++)
        {
            decimal diff = prices[i] - prices[i - 1];
            if (diff >= 0) gainSum += diff;
            else lossSum += Math.Abs(diff);
        }

        decimal avgGain = gainSum / period;
        decimal avgLoss = lossSum / period;

        result[period] = avgLoss == 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

        // Wilder's smoothing
        for (int i = period + 1; i < prices.Length; i++)
        {
            decimal diff = prices[i] - prices[i - 1];
            decimal currentGain = diff > 0 ? diff : 0;
            decimal currentLoss = diff < 0 ? Math.Abs(diff) : 0;

            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

            if (avgLoss == 0)
            {
                result[i] = 100;
            }
            else
            {
                decimal rs = avgGain / avgLoss;
                result[i] = 100 - (100 / (1 + rs));
            }
        }

        // Fill initial warmup bars with 50 (neutral)
        for (int i = 0; i < period; i++)
        {
            result[i] = 50m;
        }

        return result;
    }

    public (decimal[] MacdLine, decimal[] SignalLine, decimal[] Histogram) CalculateMacd(decimal[] prices, int fast = 12, int slow = 26, int signal = 9)
    {
        var fastEma = CalculateEma(prices, fast);
        var slowEma = CalculateEma(prices, slow);

        var macdLine = new decimal[prices.Length];
        for (int i = 0; i < prices.Length; i++)
        {
            macdLine[i] = fastEma[i] - slowEma[i];
        }

        var signalLine = CalculateEma(macdLine, signal);
        var histogram = new decimal[prices.Length];

        for (int i = 0; i < prices.Length; i++)
        {
            histogram[i] = macdLine[i] - signalLine[i];
        }

        return (macdLine, signalLine, histogram);
    }

    public decimal[] CalculateAtr(Candle[] candles, int period = 14)
    {
        if (candles.Length == 0) return Array.Empty<decimal>();
        var tr = new decimal[candles.Length];
        tr[0] = candles[0].High - candles[0].Low;

        for (int i = 1; i < candles.Length; i++)
        {
            decimal hl = candles[i].High - candles[i].Low;
            decimal hc = Math.Abs(candles[i].High - candles[i - 1].Close);
            decimal lc = Math.Abs(candles[i].Low - candles[i - 1].Close);
            tr[i] = Math.Max(hl, Math.Max(hc, lc));
        }

        return CalculateEma(tr, period);
    }

    public (decimal[] Upper, decimal[] Middle, decimal[] Lower, decimal[] Bandwidth) CalculateBollingerBands(decimal[] prices, int period = 20, decimal multiplier = 2.0m)
    {
        var middle = CalculateSma(prices, period);
        var upper = new decimal[prices.Length];
        var lower = new decimal[prices.Length];
        var bandwidth = new decimal[prices.Length];

        for (int i = 0; i < prices.Length; i++)
        {
            if (i < period - 1)
            {
                upper[i] = prices[i];
                lower[i] = prices[i];
                bandwidth[i] = 0;
                continue;
            }

            decimal sumSquares = 0;
            for (int j = i - period + 1; j <= i; j++)
            {
                decimal diff = prices[j] - middle[i];
                sumSquares += diff * diff;
            }

            double variance = (double)(sumSquares / period);
            decimal stdDev = (decimal)Math.Sqrt(variance);

            upper[i] = middle[i] + (multiplier * stdDev);
            lower[i] = middle[i] - (multiplier * stdDev);
            bandwidth[i] = middle[i] > 0 ? ((upper[i] - lower[i]) / middle[i]) * 100 : 0;
        }

        return (upper, middle, lower, bandwidth);
    }

    public (decimal[] SuperTrend, bool[] IsBullish) CalculateSuperTrend(Candle[] candles, int period = 10, decimal multiplier = 3.0m)
    {
        if (candles.Length == 0) return (Array.Empty<decimal>(), Array.Empty<bool>());
        var atr = CalculateAtr(candles, period);
        int n = candles.Length;

        var superTrend = new decimal[n];
        var isBullish = new bool[n];

        var basicUpper = new decimal[n];
        var basicLower = new decimal[n];
        var finalUpper = new decimal[n];
        var finalLower = new decimal[n];

        for (int i = 0; i < n; i++)
        {
            decimal hl2 = (candles[i].High + candles[i].Low) / 2m;
            basicUpper[i] = hl2 + (multiplier * atr[i]);
            basicLower[i] = hl2 - (multiplier * atr[i]);

            if (i == 0)
            {
                finalUpper[i] = basicUpper[i];
                finalLower[i] = basicLower[i];
                isBullish[i] = candles[i].Close > hl2;
                superTrend[i] = isBullish[i] ? finalLower[i] : finalUpper[i];
                continue;
            }

            finalUpper[i] = (basicUpper[i] < finalUpper[i - 1] || candles[i - 1].Close > finalUpper[i - 1])
                ? basicUpper[i]
                : finalUpper[i - 1];

            finalLower[i] = (basicLower[i] > finalLower[i - 1] || candles[i - 1].Close < finalLower[i - 1])
                ? basicLower[i]
                : finalLower[i - 1];

            if (candles[i].Close > finalUpper[i - 1])
                isBullish[i] = true;
            else if (candles[i].Close < finalLower[i - 1])
                isBullish[i] = false;
            else
                isBullish[i] = isBullish[i - 1];

            superTrend[i] = isBullish[i] ? finalLower[i] : finalUpper[i];
        }

        return (superTrend, isBullish);
    }

    public decimal CalculateVwap(Candle[] sessionCandles)
    {
        if (sessionCandles.Length == 0) return 0;
        decimal cumulativeTypicalPriceVolume = 0;
        long cumulativeVolume = 0;

        foreach (var c in sessionCandles)
        {
            decimal typicalPrice = (c.High + c.Low + c.Close) / 3m;
            cumulativeTypicalPriceVolume += typicalPrice * c.Volume;
            cumulativeVolume += c.Volume;
        }

        return cumulativeVolume > 0 ? cumulativeTypicalPriceVolume / cumulativeVolume : sessionCandles[^1].Close;
    }

    public decimal CalculateRvol(Candle currentCandle, Candle[] historicalCandlesAtSameTime)
    {
        if (historicalCandlesAtSameTime.Length == 0) return 1.0m;
        long totalHistoricalVolume = 0;
        foreach (var h in historicalCandlesAtSameTime)
        {
            totalHistoricalVolume += h.Volume;
        }

        decimal avg = (decimal)totalHistoricalVolume / historicalCandlesAtSameTime.Length;
        return avg > 0 ? Math.Round((decimal)currentCandle.Volume / avg, 2) : 1.0m;
    }
}
