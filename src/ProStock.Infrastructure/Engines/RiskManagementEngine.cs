using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Engines;

public class RiskManagementEngine : IRiskEngine
{
    private const decimal MaxSingleTradeRiskPercent = 2.0m;
    private const decimal MaxPortfolioHeatPercent = 40.0m;
    private const decimal DailyDrawdownLimitPercent = 3.0m;

    public RiskEvaluationResult EvaluateTradeRisk(
        PaperAccount account,
        string symbol,
        Direction direction,
        int quantity,
        decimal entryPrice,
        decimal stopLoss)
    {
        // 1. Check Circuit Breaker
        if (account.CircuitBreakerTripped)
        {
            return new RiskEvaluationResult(
                false,
                $"Trading halted: Daily circuit breaker tripped ({account.TrippedReason}).",
                0,
                0
            );
        }

        // 2. Validate Stop Loss placement
        if (direction == Direction.Long && stopLoss >= entryPrice)
        {
            return new RiskEvaluationResult(false, "Invalid stop loss: For Long trade, SL must be below entry.", 0, 0);
        }
        if (direction == Direction.Short && stopLoss <= entryPrice)
        {
            return new RiskEvaluationResult(false, "Invalid stop loss: For Short trade, SL must be above entry.", 0, 0);
        }

        // 3. Single Trade Risk Cap (<= 2%)
        decimal perShareRisk = Math.Abs(entryPrice - stopLoss);
        decimal dollarRisk = perShareRisk * quantity;
        decimal tradeRiskPercent = (dollarRisk / account.TotalEquity) * 100;

        if (tradeRiskPercent > MaxSingleTradeRiskPercent)
        {
            return new RiskEvaluationResult(
                false,
                $"Risk per trade ({tradeRiskPercent:F2}%) exceeds maximum allowed limit ({MaxSingleTradeRiskPercent}%).",
                dollarRisk,
                tradeRiskPercent
            );
        }

        // 4. Portfolio Heat Check (<= 40%)
        decimal projectedHeat = account.PortfolioHeatPercent + tradeRiskPercent;
        if (projectedHeat > account.MaxAllowedHeatPercent)
        {
            return new RiskEvaluationResult(
                false,
                $"Projected portfolio heat ({projectedHeat:F2}%) exceeds maximum threshold ({account.MaxAllowedHeatPercent}%).",
                dollarRisk,
                tradeRiskPercent
            );
        }

        // 5. Margin Availability Check
        decimal requiredMargin = entryPrice * quantity;
        if (requiredMargin > account.MarginAvailable)
        {
            return new RiskEvaluationResult(
                false,
                $"Insufficient margin: Required ₹{requiredMargin:N2}, available ₹{account.MarginAvailable:N2}.",
                dollarRisk,
                tradeRiskPercent
            );
        }

        return new RiskEvaluationResult(true, null, dollarRisk, tradeRiskPercent);
    }

    public bool CheckDailyCircuitBreaker(PaperAccount account)
    {
        if (account.CircuitBreakerTripped) return true;

        if (account.DailyPnLPercent <= -DailyDrawdownLimitPercent)
        {
            TripCircuitBreaker(account, $"Daily loss ({account.DailyPnLPercent:F2}%) breached safety limit (-{DailyDrawdownLimitPercent}%).");
            return true;
        }

        return false;
    }

    public void TripCircuitBreaker(PaperAccount account, string reason)
    {
        account.CircuitBreakerTripped = true;
        account.TrippedReason = reason;
    }
}
