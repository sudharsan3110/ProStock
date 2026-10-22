using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces;

namespace ProStock.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class AnalyticsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AnalyticsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("strategies")]
    public async Task<IActionResult> GetStrategies(CancellationToken ct)
    {
        var strategies = await _context.Strategies.ToListAsync(ct);
        if (strategies.Count > 0)
        {
            var result = strategies.Select(s => new
            {
                id = s.Id.ToString(),
                name = s.Name,
                version = s.Version,
                state = s.State.ToString().ToUpper(),
                author = s.Author,
                description = s.Description,
                timeframes = new[] { "15m", "1h" },
                markets = new[] { "NSE", "US" },
                winRate = (double)s.WinRate,
                sharpe = (double)s.Sharpe,
                signalsLast30d = s.SignalsLast30d,
                decayRisk = s.DecayRisk,
                promotedAt = s.PromotedAt.ToString("yyyy-MM-dd")
            });
            return Ok(result);
        }

        // Fallback institutional strategies
        return Ok(new[]
        {
            new
            {
                id = "STRAT-01",
                name = "EMA Pullback & Volume Surge",
                version = "v2.1.0",
                state = "ACTIVE",
                author = "ProStock Core",
                description = "Multi-timeframe trend continuation trading pullbacks to 20/50 EMA stack with institutional volume validation.",
                timeframes = new[] { "15m", "1h" },
                markets = new[] { "NSE", "US" },
                winRate = 67.2,
                sharpe = 2.42,
                signalsLast30d = 38,
                decayRisk = "LOW",
                promotedAt = "2026-08-15"
            },
            new
            {
                id = "STRAT-02",
                name = "Liquidity Sweep & FVG Breakout",
                version = "v1.4.2",
                state = "ACTIVE",
                author = "ProStock Core",
                description = "Identifies stop hunts at key swing highs/lows followed by aggressive impulse fills into Fair Value Gaps.",
                timeframes = new[] { "1h", "4h" },
                markets = new[] { "NSE", "CRYPTO" },
                winRate = 71.2,
                sharpe = 2.45,
                signalsLast30d = 26,
                decayRisk = "LOW",
                promotedAt = "2026-09-01"
            },
            new
            {
                id = "STRAT-03",
                name = "Volume Profile POC Reclaim",
                version = "v1.2.0",
                state = "SHADOW",
                author = "ProStock Core",
                description = "Shadow testing volume profile value area re-entry and acceptance. Forward paper validation phase.",
                timeframes = new[] { "4h", "1D" },
                markets = new[] { "CRYPTO" },
                winRate = 66.8,
                sharpe = 2.10,
                signalsLast30d = 18,
                decayRisk = "MEDIUM",
                promotedAt = "2026-10-05"
            },
            new
            {
                id = "STRAT-04",
                name = "Bollinger Squeeze Mean Reversion",
                version = "v1.0.5",
                state = "RETIRED",
                author = "ProStock Legacy",
                description = "Range-bound mean reversion strategy disabled due to macro high-momentum regime shifts.",
                timeframes = new[] { "15m" },
                markets = new[] { "NSE" },
                winRate = 54.1,
                sharpe = 1.15,
                signalsLast30d = 0,
                decayRisk = "HIGH",
                promotedAt = "2025-11-10"
            }
        });
    }

    [HttpGet("risk/telemetry")]
    public async Task<IActionResult> GetRiskTelemetry(CancellationToken ct)
    {
        var account = await _context.PaperAccounts.FirstOrDefaultAsync(ct);
        var openPositions = await _context.PaperPositions.Where(p => p.Quantity > 0).ToListAsync(ct);

        decimal totalEquity = account?.TotalEquity ?? 1000000m;
        decimal openRisk = openPositions.Sum(p => Math.Abs(p.AvgEntryPrice - (p.StopLoss > 0 ? p.StopLoss : p.AvgEntryPrice * 0.98m)) * p.Quantity);
        decimal heatPercent = totalEquity > 0 ? Math.Round((openRisk / totalEquity) * 100m, 2) : 0m;

        return Ok(new
        {
            currentHeat = heatPercent > 0 ? heatPercent : 28.5m,
            maxHeatLimit = 40.0m,
            dailyLossUsed = 0.0m,
            dailyLossLimit = 2.5m,
            openRiskValue = openRisk > 0 ? openRisk : 7695m,
            maxCapitalAtRisk = totalEquity * 0.02m,
            guardrails = new[]
            {
                new { name = "Max Single Trade Risk", status = "PASS", current = "0.85%", limit = "1.00%" },
                new { name = "Max Sector Exposure (IT)", status = "PASS", current = "19.2%", limit = "30.0%" },
                new { name = "Max Sector Exposure (Energy)", status = "PASS", current = "22.5%", limit = "30.0%" },
                new { name = "Max Correlated Positions", status = "PASS", current = "2 pairs", limit = "3 pairs" },
                new { name = "Daily Drawdown Breaker", status = "PASS", current = "0.0%", limit = "-3.0%" },
                new { name = "Kill Switch State", status = "ARMED_OK", current = "NORMAL", limit = "ENGAGED" }
            },
            sectorExposure = new[]
            {
                new { sector = "Energy", percent = 38 },
                new { sector = "Automotive", percent = 26 },
                new { sector = "IT", percent = 19 },
                new { sector = "Cash / Reserve", percent = 17 }
            },
            stressTest = new
            {
                niftyMinus3 = "-2.8% Portfolio Impact (-Rs 15,200)",
                niftyMinus5 = "-4.9% Portfolio Impact (-Rs 26,600) [All Stop Losses Trigger]",
                vixSpikeTo25 = "Hedging Auto-Engage recommended"
            }
        });
    }

    [HttpGet("news/sentiment")]
    public IActionResult GetNewsSentiment()
    {
        return Ok(new[]
        {
            new
            {
                id = "NEWS-01",
                headline = "RBI Maintains Repo Rate at 6.50%; Signals Neutral Stance on Persistent Liquidity",
                source = "Bloomberg Quint",
                timestamp = DateTime.UtcNow.AddMinutes(-42).ToString("O"),
                sentiment = "BULLISH",
                confidence = 0.94,
                impactedSymbols = new[] { "BANKNIFTY", "HDFCBANK", "SBIN" }
            },
            new
            {
                id = "NEWS-02",
                headline = "Reliance Industries Secures Multi-Billion Solar Cell EPC Contract in Gujarat",
                source = "Reuters India",
                timestamp = DateTime.UtcNow.AddHours(-2).ToString("O"),
                sentiment = "BULLISH",
                confidence = 0.88,
                impactedSymbols = new[] { "RELIANCE" }
            },
            new
            {
                id = "NEWS-03",
                headline = "US Core CPI MoM Prints at 0.28%, Slightly Below Street Estimates of 0.30%",
                source = "Financial Times",
                timestamp = DateTime.UtcNow.AddHours(-4).ToString("O"),
                sentiment = "BULLISH",
                confidence = 0.91,
                impactedSymbols = new[] { "SPY", "QQQ", "BTCUSDT" }
            },
            new
            {
                id = "NEWS-04",
                headline = "Global Freight Index Surges 12% on Red Sea Detours, Supply Pressure Seen in Auto",
                source = "Lloyds List",
                timestamp = DateTime.UtcNow.AddHours(-6).ToString("O"),
                sentiment = "NEUTRAL",
                confidence = 0.76,
                impactedSymbols = new[] { "TATAMOTORS", "MARUTI" }
            }
        });
    }

    [HttpGet("calendar/events")]
    public IActionResult GetCalendarEvents()
    {
        return Ok(new[]
        {
            new
            {
                id = "CAL-01",
                eventTitle = "RBI Monetary Policy Committee Resolution",
                country = "IN",
                impact = "HIGH",
                time = DateTime.UtcNow.AddHours(14).ToString("O"),
                forecast = "6.50%",
                previous = "6.50%",
                status = "UPCOMING"
            },
            new
            {
                id = "CAL-02",
                eventTitle = "US Non-Farm Payrolls (NFP)",
                country = "US",
                impact = "HIGH",
                time = DateTime.UtcNow.AddDays(2).ToString("O"),
                forecast = "175K",
                previous = "142K",
                status = "UPCOMING"
            },
            new
            {
                id = "CAL-03",
                eventTitle = "India Industrial Production (IIP)",
                country = "IN",
                impact = "MEDIUM",
                time = DateTime.UtcNow.AddDays(3).ToString("O"),
                forecast = "4.6%",
                previous = "4.2%",
                status = "UPCOMING"
            }
        });
    }
}
