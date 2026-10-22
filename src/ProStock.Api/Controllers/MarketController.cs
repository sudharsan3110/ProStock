using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MarketController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public MarketController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var instruments = await _context.Instruments.ToListAsync(ct);

        var indices = instruments.Take(6).Select(i => new
        {
            symbol = i.Symbol,
            name = i.Name,
            price = i.Price,
            change = i.Change,
            changePercent = i.ChangePercent,
            market = i.Market.ToString(),
            high = i.High,
            low = i.Low,
            volume = i.Volume
        }).ToList();

        var sectors = new[]
        {
            new { name = "Nifty IT", changePercent = 1.85m, marketCap = "₹34.2T", advances = 8, declines = 2, heat = 0.8m },
            new { name = "Nifty Bank", changePercent = 0.42m, marketCap = "₹48.1T", advances = 7, declines = 5, heat = 0.4m },
            new { name = "Nifty Auto", changePercent = 1.12m, marketCap = "₹22.5T", advances = 11, declines = 4, heat = 0.6m },
            new { name = "Nifty Pharma", changePercent = -0.35m, marketCap = "₹18.9T", advances = 4, declines = 16, heat = -0.3m },
            new { name = "Nifty FMCG", changePercent = 0.15m, marketCap = "₹26.4T", advances = 9, declines = 6, heat = 0.1m }
        };

        var marketBreadth = new
        {
            advances = 1342,
            declines = 721,
            unchanged = 84,
            ratio = 1.86m,
            newHighs = 88,
            newLows = 12
        };

        return Ok(new
        {
            indices,
            sectors,
            marketBreadth,
            lastUpdated = DateTime.UtcNow
        });
    }

    [HttpGet("tickers")]
    public async Task<ActionResult<IEnumerable<Instrument>>> GetTickers(CancellationToken ct)
    {
        var tickers = await _context.Instruments.OrderBy(i => i.Symbol).ToListAsync(ct);
        return Ok(tickers);
    }

    public record CandleDto(string Time, decimal Open, decimal High, decimal Low, decimal Close, long Volume, decimal Vwap);

    [HttpGet("candles")]
    public async Task<IActionResult> GetCandles([FromQuery] string symbol = "RELIANCE", [FromQuery] string timeframe = "15m", CancellationToken ct = default)
    {
        var candles = await FetchCandlesForSymbol(symbol, ct);
        return Ok(candles);
    }

    [HttpGet("candles/{symbol}")]
    public async Task<IActionResult> GetCandlesBySymbol(string symbol, [FromQuery] string timeframe = "15m", CancellationToken ct = default)
    {
        var candles = await FetchCandlesForSymbol(symbol, ct);
        var result = new Dictionary<string, List<CandleDto>>
        {
            [symbol] = candles
        };
        return Ok(result);
    }

    private async Task<List<CandleDto>> FetchCandlesForSymbol(string symbol, CancellationToken ct)
    {
        var dbCandles = await _context.Candles
            .Where(c => c.Symbol == symbol)
            .OrderBy(c => c.Timestamp)
            .Take(120)
            .Select(c => new CandleDto(
                c.Timestamp.ToString("HH:mm"),
                c.Open,
                c.High,
                c.Low,
                c.Close,
                c.Volume,
                c.Vwap ?? c.Close
            ))
            .ToListAsync(ct);

        if (dbCandles.Count > 0)
        {
            return dbCandles;
        }

        return GenerateFallbackCandles(symbol);
    }

    private List<CandleDto> GenerateFallbackCandles(string symbol)
    {
        var list = new List<CandleDto>();
        decimal price = symbol == "NIFTY" ? 25150m : (symbol == "BANKNIFTY" ? 52300m : 2480m);
        var baseTime = DateTime.UtcNow.AddHours(-15);

        for (int i = 0; i < 60; i++)
        {
            decimal delta = (decimal)(new Random(i).NextDouble() - 0.47) * 8m;
            decimal open = price;
            decimal close = price + delta;
            decimal high = Math.Max(open, close) + (decimal)new Random(i * 3).NextDouble() * 4m;
            decimal low = Math.Min(open, close) - (decimal)new Random(i * 5).NextDouble() * 4m;
            long volume = new Random(i * 7).Next(40000, 250000);

            list.Add(new CandleDto(
                baseTime.AddMinutes(i * 15).ToString("HH:mm"),
                Math.Round(open, 2),
                Math.Round(high, 2),
                Math.Round(low, 2),
                Math.Round(close, 2),
                volume,
                Math.Round((high + low + close) / 3m, 2)
            ));

            price = close;
        }

        return list;
    }
}
