using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ProStock.Api.Contracts;
using ProStock.Application.Interfaces;
using ProStock.Domain.Enums;
using ProStock.Infrastructure.MarketData;

namespace ProStock.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MarketController : ControllerBase
{
    private const int ChartCandles = 120;

    private readonly IApplicationDbContext _context;
    private readonly BinanceOptions _binance;
    private readonly BinanceRestClient _binanceRest;
    private readonly IMemoryCache _cache;

    public MarketController(
        IApplicationDbContext context,
        BinanceOptions binance,
        BinanceRestClient binanceRest,
        IMemoryCache cache)
    {
        _context = context;
        _binance = binance;
        _binanceRest = binanceRest;
        _cache = cache;
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
            market = ApiMappers.MarketLabel(i.Market),
            currency = i.Market.CurrencySymbol(),
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
            marketSessions = MarketSessions.Current(DateTime.UtcNow),
            lastUpdated = DateTime.UtcNow
        });
    }

    [HttpGet("tickers")]
    public async Task<IActionResult> GetTickers(CancellationToken ct)
    {
        var instruments = await _context.Instruments.OrderBy(i => i.Symbol).ToListAsync(ct);
        var now = DateTime.UtcNow;
        return Ok(instruments.Select(i => ApiMappers.ToTickerDto(i, now)));
    }

    public record CandleDto(string Time, decimal Open, decimal High, decimal Low, decimal Close, decimal Volume, decimal Vwap);

    [HttpGet("candles")]
    public async Task<IActionResult> GetCandles([FromQuery] string symbol = "RELIANCE", [FromQuery] string timeframe = "15m", CancellationToken ct = default)
    {
        var (candles, error) = await FetchCandlesForSymbol(symbol, timeframe, ct);
        return error ?? Ok(candles);
    }

    [HttpGet("candles/{symbol}")]
    public async Task<IActionResult> GetCandlesBySymbol(string symbol, [FromQuery] string timeframe = "15m", CancellationToken ct = default)
    {
        var (candles, error) = await FetchCandlesForSymbol(symbol, timeframe, ct);
        if (error != null) return error;

        return Ok(new Dictionary<string, List<CandleDto>> { [symbol] = candles! });
    }

    private async Task<(List<CandleDto>? Candles, IActionResult? Error)> FetchCandlesForSymbol(string symbol, string timeframe, CancellationToken ct)
    {
        if (_binance.IsTracked(symbol))
        {
            return await FetchBinanceCandles(symbol.ToUpperInvariant(), timeframe, ct);
        }

        var dbCandles = await _context.Candles
            .Where(c => c.Symbol == symbol)
            .OrderBy(c => c.Timestamp)
            .Take(ChartCandles)
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

        return (dbCandles.Count > 0 ? dbCandles : GenerateFallbackCandles(symbol), null);
    }

    /// <summary>
    /// Crypto charts come straight from Binance klines for whichever interval the chart asks
    /// for, cached briefly so several open charts don't multiply REST calls.
    /// </summary>
    private async Task<(List<CandleDto>? Candles, IActionResult? Error)> FetchBinanceCandles(string symbol, string timeframe, CancellationToken ct)
    {
        var interval = BinanceIntervals.FromLabel(timeframe);
        if (interval == null)
        {
            return (null, BadRequest(new { message = $"Unsupported timeframe '{timeframe}'." }));
        }

        try
        {
            var candles = await _cache.GetOrCreateAsync($"binance:klines:{symbol}:{interval}", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(5);
                var klines = await _binanceRest.GetKlinesAsync(symbol, interval, ChartCandles, ct);
                var vwap = CryptoMarketAnalytics.SessionVwap(klines, resetDaily: interval is not ("1d" or "1w"));
                return klines.Select((k, idx) => new CandleDto(
                    k.OpenTimeUtc.ToString("O"),
                    k.Open,
                    k.High,
                    k.Low,
                    k.Close,
                    k.Volume,
                    Math.Round(vwap[idx], 4))).ToList();
            });
            return (candles, null);
        }
        catch (Exception ex) when (ex is BinanceApiException or HttpRequestException or TaskCanceledException)
        {
            return (null, StatusCode(StatusCodes.Status502BadGateway, new { message = $"Binance candles unavailable: {ex.Message}" }));
        }
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
