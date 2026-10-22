using ProStock.Domain.Entities;
using ProStock.Domain.Enums;
using ProStock.Infrastructure.Engines;
using Xunit;

namespace ProStock.UnitTests;

public class RiskManagementEngineTests
{
    private readonly RiskManagementEngine _engine = new();

    [Fact]
    public void EvaluateTradeRisk_ShouldReject_WhenRiskExceeds2Percent()
    {
        var account = new PaperAccount
        {
            TotalEquity = 100000m,
            CashBalance = 100000m,
            PortfolioHeatPercent = 0
        };

        // Buying 100 shares at 100 with SL at 75 -> Risk = 25 * 100 = 2500 (2.5% of 100k -> Exceeds 2% cap!)
        var result = _engine.EvaluateTradeRisk(account, "RELIANCE", Direction.Long, 100, 100m, 75m);

        Assert.False(result.IsAllowed);
        Assert.Contains("exceeds maximum allowed limit", result.RejectionReason);
    }

    [Fact]
    public void EvaluateTradeRisk_ShouldAccept_WhenRiskWithinLimit()
    {
        var account = new PaperAccount
        {
            TotalEquity = 100000m,
            CashBalance = 100000m,
            PortfolioHeatPercent = 5.0m
        };

        // Buying 100 shares at 100 with SL at 90 -> Risk = 10 * 100 = 1000 (1.0% of 100k -> Safe!)
        var result = _engine.EvaluateTradeRisk(account, "RELIANCE", Direction.Long, 100, 100m, 90m);

        Assert.True(result.IsAllowed);
        Assert.Null(result.RejectionReason);
        Assert.Equal(1000m, result.CalculatedDollarRisk);
    }

    [Fact]
    public void CheckDailyCircuitBreaker_ShouldTrip_WhenLossHits3Percent()
    {
        var account = new PaperAccount
        {
            DailyPnLPercent = -3.2m,
            CircuitBreakerTripped = false
        };

        bool tripped = _engine.CheckDailyCircuitBreaker(account);

        Assert.True(tripped);
        Assert.True(account.CircuitBreakerTripped);
        Assert.Contains("Daily loss", account.TrippedReason);
    }
}
