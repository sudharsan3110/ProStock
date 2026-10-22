using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Application.Interfaces.Engines;

public interface ITechnicalIndicatorEngine
{
    decimal[] CalculateSma(decimal[] prices, int period);
    decimal[] CalculateEma(decimal[] prices, int period);
    decimal[] CalculateRsi(decimal[] prices, int period = 14);
    (decimal[] MacdLine, decimal[] SignalLine, decimal[] Histogram) CalculateMacd(decimal[] prices, int fast = 12, int slow = 26, int signal = 9);
    decimal[] CalculateAtr(Candle[] candles, int period = 14);
    (decimal[] Upper, decimal[] Middle, decimal[] Lower, decimal[] Bandwidth) CalculateBollingerBands(decimal[] prices, int period = 20, decimal multiplier = 2.0m);
    (decimal[] SuperTrend, bool[] IsBullish) CalculateSuperTrend(Candle[] candles, int period = 10, decimal multiplier = 3.0m);
    decimal CalculateVwap(Candle[] sessionCandles);
    decimal CalculateRvol(Candle currentCandle, Candle[] historicalCandlesAtSameTime);
}

public interface IRegimeDetectionEngine
{
    RegimeType DetectRegime(Candle[] candles);
}

public record SignalGenerationContext(
    Instrument Instrument,
    Candle[] Candles,
    RegimeType CurrentRegime,
    decimal AccountEquity,
    decimal MaxTradeRiskPercent = 1.5m
);

public interface ISignalEngine
{
    Task<Signal?> EvaluateSignalsAsync(SignalGenerationContext context, CancellationToken ct = default);
}

public record RiskEvaluationResult(
    bool IsAllowed,
    string? RejectionReason,
    decimal CalculatedDollarRisk,
    decimal HeatImpactPercent
);

public interface IRiskEngine
{
    RiskEvaluationResult EvaluateTradeRisk(PaperAccount account, string symbol, Direction direction, int quantity, decimal entryPrice, decimal stopLoss);
    bool CheckDailyCircuitBreaker(PaperAccount account);
    void TripCircuitBreaker(PaperAccount account, string reason);
}

public interface IPaperBroker
{
    Task<PaperOrder> PlaceOrderAsync(Guid accountId, string symbol, OrderSide side, OrderType type, int quantity, decimal price, decimal? stopLoss = null, decimal? target = null, CancellationToken ct = default);
    Task ProcessTickAsync(string symbol, decimal currentPrice, CancellationToken ct = default);
    Task<bool> CancelOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<PaperAccount> GetOrCreateAccountAsync(Guid userId, CancellationToken ct = default);
}

public record BacktestRequest(
    string StrategyName,
    string Symbol,
    Timeframe Timeframe,
    DateTime StartDate,
    DateTime EndDate,
    decimal InitialCapital = 1000000m,
    decimal SlippagePercent = 0.02m
);

public interface IBacktestEngine
{
    Task<BacktestRun> RunBacktestAsync(BacktestRequest request, CancellationToken ct = default);
}

public interface IAlertDispatcher
{
    Task DispatchSignalAlertAsync(Signal signal, CancellationToken ct = default);
    Task DispatchCircuitBreakerAlertAsync(string reason, decimal drawdownPercent, CancellationToken ct = default);
}

public interface ILLMExplainerService
{
    Task<(string Summary, string[] GroundingFacts)> ExplainSignalAsync(Signal signal, CancellationToken ct = default);
}
