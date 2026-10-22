using ProStock.Infrastructure.Engines;
using Xunit;

namespace ProStock.UnitTests;

public class TechnicalIndicatorEngineTests
{
    private readonly TechnicalIndicatorEngine _engine = new();

    [Fact]
    public void CalculateSma_ShouldReturnCorrectAverages()
    {
        decimal[] prices = [10m, 20m, 30m, 40m, 50m];
        var sma = _engine.CalculateSma(prices, 3);

        // Third element (index 2) should be (10+20+30)/3 = 20
        Assert.Equal(20m, sma[2]);
        // Fourth element (index 3) should be (20+30+40)/3 = 30
        Assert.Equal(30m, sma[3]);
        // Fifth element (index 4) should be (30+40+50)/3 = 40
        Assert.Equal(40m, sma[4]);
    }

    [Fact]
    public void CalculateEma_ShouldApplyMultiplierAccurately()
    {
        decimal[] prices = [22m, 22.5m, 22.8m, 23m, 23.5m, 24m];
        var ema = _engine.CalculateEma(prices, 3);

        Assert.Equal(prices.Length, ema.Length);
        Assert.True(ema[^1] > ema[0], "EMA should reflect upward price trend");
    }

    [Fact]
    public void CalculateRsi_ShouldBoundBetween0And100()
    {
        decimal[] prices = [
            44.34m, 44.09m, 44.15m, 43.61m, 44.33m, 44.83m, 45.10m, 45.42m,
            45.84m, 46.08m, 45.89m, 46.03m, 45.61m, 46.28m, 46.28m, 46.00m
        ];

        var rsi = _engine.CalculateRsi(prices, 14);

        Assert.Equal(prices.Length, rsi.Length);
        foreach (var val in rsi)
        {
            Assert.InRange(val, 0m, 100m);
        }

        // Bullish series should have RSI > 50
        Assert.True(rsi[^1] > 50m);
    }
}
