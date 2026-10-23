using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProStock.Api.Contracts;
using ProStock.Api.Hubs;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;
using ProStock.Infrastructure.MarketData;

namespace ProStock.Api.BackgroundServices;

/// <summary>
/// Live crypto pipeline for the symbols in PROSTOCK_BINANCE_SYMBOLS:
///   1. Backfills instrument metadata, 24h stats and 15m/1d candles over Binance REST.
///   2. Streams the 24h ticker and 15m kline for every symbol over one WebSocket.
///   3. Once a second, persists instrument state, feeds prices to the paper broker
///      (stop/target fills) and broadcasts TickUpdate on /hubs/market.
///   4. On every closed 15m candle, recomputes ATR / regime / RVOL and runs the
///      signal engine; new signals are stored, alerted and broadcast on /hubs/signals.
/// </summary>
public sealed class BinanceMarketDataWorker : BackgroundService
{
    private const int MaxCandlesInMemory = 1000;
    private static readonly TimeSpan SignalDedupWindow = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan ScoreLifetime = TimeSpan.FromHours(4);
    private static readonly TimeSpan DailyKlineRefresh = TimeSpan.FromHours(1);

    private readonly IServiceProvider _services;
    private readonly IHubContext<MarketHub> _marketHub;
    private readonly IHubContext<SignalHub> _signalHub;
    private readonly BinanceOptions _options;
    private readonly BinanceRestClient _rest;
    private readonly BinanceStreamClient _stream;
    private readonly MarketFeedHealth _health;
    private readonly CryptoMarketAnalytics _analytics;
    private readonly ILogger<BinanceMarketDataWorker> _logger;

    private readonly object _gate = new();
    private readonly Dictionary<string, SymbolState> _states = new(StringComparer.OrdinalIgnoreCase);

    private sealed class SymbolState
    {
        public required BinanceSymbolInfo Info;
        public required Binance24hTicker Ticker;
        public List<BinanceKline> Klines = new();      // closed 15m klines, oldest first
        public BinanceKline? Forming;
        public List<BinanceKline> Daily = new();
        public DateTime DailyRefreshedUtc;
        public required CryptoAnalyticsResult Analytics;
        public decimal Score;
        public DateTime ScoreSetUtc;
        public bool Dirty = true;
    }

    public BinanceMarketDataWorker(
        IServiceProvider services,
        IHubContext<MarketHub> marketHub,
        IHubContext<SignalHub> signalHub,
        BinanceOptions options,
        BinanceRestClient rest,
        BinanceStreamClient stream,
        MarketFeedHealth health,
        CryptoMarketAnalytics analytics,
        ILogger<BinanceMarketDataWorker> logger)
    {
        _services = services;
        _marketHub = marketHub;
        _signalHub = signalHub;
        _options = options;
        _rest = rest;
        _stream = stream;
        _health = health;
        _analytics = analytics;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!_options.Enabled || _options.Symbols.Count == 0)
        {
            _health.MarkDisabled();
            _logger.LogInformation("Binance market data disabled (PROSTOCK_BINANCE_ENABLED=false or no symbols).");
            return;
        }

        _logger.LogInformation("Binance market data starting for {Symbols} via {Rest}",
            string.Join(", ", _options.Symbols), _options.RestBaseUrl);

        var backoff = TimeSpan.FromSeconds(2);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await BootstrapAsync(ct);
                break;
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _health.MarkFailure(ex.Message, willRetry: true);
                _logger.LogError("Binance bootstrap failed: {Message}. Retrying in {Delay}s.", ex.Message, backoff.TotalSeconds);
                await Task.Delay(backoff, ct);
                backoff = TimeSpan.FromSeconds(Math.Min(backoff.TotalSeconds * 2, 60));
            }
        }

        await Task.WhenAll(StreamLoopAsync(ct), PublishLoopAsync(ct));
    }

    // ---------------------------------------------------------------- bootstrap

    private async Task BootstrapAsync(CancellationToken ct)
    {
        var infos = await _rest.GetSymbolInfoAsync(_options.Symbols, ct);
        var tickers = (await _rest.Get24hTickersAsync(_options.Symbols, ct)).ToDictionary(t => t.Symbol);

        foreach (var info in infos)
        {
            var klines = await _rest.GetKlinesAsync(info.Symbol, BinanceIntervals.Signal, _options.BackfillCandles, ct);
            var daily = await _rest.GetKlinesAsync(info.Symbol, "1d", 21, ct);

            var closed = klines.Where(k => k.IsClosed).ToList();
            var state = new SymbolState
            {
                Info = info,
                Ticker = tickers[info.Symbol],
                Klines = closed,
                Forming = klines.LastOrDefault(k => !k.IsClosed),
                Daily = daily.ToList(),
                DailyRefreshedUtc = DateTime.UtcNow,
                Analytics = _analytics.Compute(ToCandles(info.Symbol, closed), daily)
            };

            using (var scope = _services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                var instrument = await db.Instruments.FirstOrDefaultAsync(i => i.Symbol == info.Symbol, ct);
                if (instrument == null)
                {
                    instrument = new Instrument { Symbol = info.Symbol };
                    db.Instruments.Add(instrument);
                }

                instrument.Name = CryptoMarketAnalytics.DisplayName(info);
                instrument.Exchange = "Binance";
                instrument.Market = MarketExchange.Binance;
                instrument.Sector = "Crypto";
                instrument.LotSize = 1;

                var cutoff = DateTime.UtcNow - ScoreLifetime;
                var latestSignal = await db.Signals
                    .Where(s => s.Symbol == info.Symbol && s.CreatedAt >= cutoff)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync(ct);
                if (latestSignal != null)
                {
                    state.Score = latestSignal.TotalScore;
                    state.ScoreSetUtc = latestSignal.CreatedAt;
                }

                Apply(instrument, state);

                // Replace any previously stored 15m history (including synthetic seed data)
                // with the real Binance series.
                await db.Candles
                    .Where(c => c.Symbol == info.Symbol && c.Timeframe == Timeframe.M15)
                    .ExecuteDeleteAsync(ct);
                db.Candles.AddRange(ToCandles(info.Symbol, closed));

                await db.SaveChangesAsync(ct);
            }

            lock (_gate) _states[info.Symbol] = state;

            _logger.LogInformation("Binance {Symbol}: {Count} x 15m candles loaded, last {Price}, regime {Regime}",
                info.Symbol, closed.Count, state.Ticker.LastPrice, state.Analytics.Regime);
        }
    }

    // ---------------------------------------------------------------- streaming

    private async Task StreamLoopAsync(CancellationToken ct)
    {
        var attempt = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await _stream.RunAsync(
                    BinanceIntervals.Signal,
                    onConnected: () =>
                    {
                        attempt = 0;
                        _health.MarkConnected();
                        _logger.LogInformation("Binance stream connected.");
                    },
                    OnMessageAsync,
                    ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _health.MarkFailure(ex.Message, willRetry: true);
                _logger.LogWarning("Binance stream dropped: {Message}", ex.Message);
            }

            if (ct.IsCancellationRequested) break;

            attempt++;
            var delay = TimeSpan.FromSeconds(Math.Min(Math.Pow(2, attempt), 60));
            await Task.Delay(delay, ct);

            try
            {
                await ResyncAfterGapAsync(ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Binance resync failed: {Message}", ex.Message);
            }
        }
    }

    private async Task OnMessageAsync(BinanceStreamMessage message)
    {
        _health.RecordMessage(message.EventTimeUtc);

        switch (message)
        {
            case BinanceTickerMessage t:
                lock (_gate)
                {
                    if (!_states.TryGetValue(t.Symbol, out var s)) return;
                    s.Ticker = t.Ticker;
                    s.Dirty = true;
                }
                break;

            case BinanceKlineMessage k when k.Interval == BinanceIntervals.Signal:
                await OnKlineAsync(k);
                break;
        }
    }

    private async Task OnKlineAsync(BinanceKlineMessage msg)
    {
        SymbolState? state;
        decimal sessionVwap;
        bool closedNew = false;

        lock (_gate)
        {
            if (!_states.TryGetValue(msg.Symbol, out state)) return;

            if (msg.Kline.IsClosed)
            {
                state.Forming = null;
                if (state.Klines.Count == 0 || msg.Kline.OpenTimeUtc > state.Klines[^1].OpenTimeUtc)
                {
                    state.Klines.Add(msg.Kline);
                    if (state.Klines.Count > MaxCandlesInMemory)
                        state.Klines.RemoveRange(0, state.Klines.Count - MaxCandlesInMemory);
                    closedNew = true;
                }
            }
            else
            {
                state.Forming = msg.Kline;
            }

            sessionVwap = CurrentSessionVwap(state, msg.Kline);
        }

        await _marketHub.Clients.All.SendAsync("CandleUpdate", new
        {
            symbol = msg.Symbol,
            timeframe = "15m",
            closed = msg.Kline.IsClosed,
            candle = ToCandleDto(msg.Kline, sessionVwap)
        });

        if (closedNew)
        {
            await OnCandleClosedAsync(state, msg.Kline);
        }
    }

    private async Task OnCandleClosedAsync(SymbolState state, BinanceKline kline)
    {
        var symbol = state.Info.Symbol;
        try
        {
            await PersistCandlesAsync(symbol, new[] { kline }, CancellationToken.None);

            if (DateTime.UtcNow - state.DailyRefreshedUtc > DailyKlineRefresh)
            {
                var daily = await _rest.GetKlinesAsync(symbol, "1d", 21);
                lock (_gate)
                {
                    state.Daily = daily.ToList();
                    state.DailyRefreshedUtc = DateTime.UtcNow;
                }
            }

            List<Candle> candles;
            lock (_gate) candles = ToCandles(symbol, state.Klines);
            var analytics = _analytics.Compute(candles, state.Daily);
            lock (_gate)
            {
                state.Analytics = analytics;
                state.Dirty = true;
            }

            await EvaluateSignalAsync(state, candles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Processing closed candle for {Symbol} failed.", symbol);
        }
    }

    private async Task EvaluateSignalAsync(SymbolState state, List<Candle> candles)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var engine = scope.ServiceProvider.GetRequiredService<ISignalEngine>();
        var alerts = scope.ServiceProvider.GetRequiredService<IAlertDispatcher>();

        var symbol = state.Info.Symbol;
        var instrument = await db.Instruments.FirstAsync(i => i.Symbol == symbol);
        lock (_gate) Apply(instrument, state);

        var equity = await db.PaperAccounts.Select(a => a.TotalEquity).FirstOrDefaultAsync();
        if (equity <= 0) equity = 1_000_000m;

        // ~25h of 15m bars: enough for EMA50, and the engine's VWAP becomes a rolling 24h VWAP.
        var window = candles.TakeLast(100).ToArray();
        var signal = await engine.EvaluateSignalsAsync(
            new SignalGenerationContext(instrument, window, instrument.Regime, equity));

        if (signal == null)
        {
            await db.SaveChangesAsync();
            return;
        }

        var cutoff = DateTime.UtcNow - SignalDedupWindow;
        var duplicate = await db.Signals.AnyAsync(s =>
            s.Symbol == symbol && s.StrategyName == signal.StrategyName && s.CreatedAt >= cutoff);
        if (duplicate)
        {
            await db.SaveChangesAsync();
            return;
        }

        db.Signals.Add(signal);
        lock (_gate)
        {
            state.Score = signal.TotalScore;
            state.ScoreSetUtc = signal.CreatedAt;
            Apply(instrument, state);
        }
        await db.SaveChangesAsync();

        _logger.LogInformation("Signal {Strategy} {Direction} {Symbol} @ {Price} (score {Score})",
            signal.StrategyName, signal.Direction, symbol, signal.CurrentPrice, signal.TotalScore);

        await alerts.DispatchSignalAlertAsync(signal);
        await _signalHub.Clients.All.SendAsync("SignalCreated", ApiMappers.ToSignalDto(signal));
    }

    /// <summary>Pulls candles that closed while the socket was down so the series has no holes.</summary>
    private async Task ResyncAfterGapAsync(CancellationToken ct)
    {
        foreach (var symbol in _options.Symbols)
        {
            var recent = await _rest.GetKlinesAsync(symbol, BinanceIntervals.Signal, 100, ct);
            List<BinanceKline> added;
            lock (_gate)
            {
                if (!_states.TryGetValue(symbol, out var state)) continue;
                var last = state.Klines.Count > 0 ? state.Klines[^1].OpenTimeUtc : DateTime.MinValue;
                added = recent.Where(k => k.IsClosed && k.OpenTimeUtc > last).ToList();
                state.Klines.AddRange(added);
                state.Forming = recent.LastOrDefault(k => !k.IsClosed);
            }

            if (added.Count == 0) continue;
            await PersistCandlesAsync(symbol, added, ct);

            SymbolState s;
            List<Candle> candles;
            lock (_gate)
            {
                s = _states[symbol];
                candles = ToCandles(symbol, s.Klines);
            }
            var analytics = _analytics.Compute(candles, s.Daily);
            lock (_gate)
            {
                s.Analytics = analytics;
                s.Dirty = true;
            }
            _logger.LogInformation("Binance {Symbol}: backfilled {Count} candles missed during reconnect.", symbol, added.Count);
        }
    }

    // ---------------------------------------------------------------- publishing

    private async Task PublishLoopAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                List<string> dirty;
                lock (_gate)
                {
                    dirty = _states.Values.Where(s => s.Dirty).Select(s => s.Info.Symbol).ToList();
                    foreach (var s in _states.Values) s.Dirty = false;
                }
                if (dirty.Count == 0) continue;

                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var broker = scope.ServiceProvider.GetRequiredService<IPaperBroker>();

                var instruments = await db.Instruments.Where(i => dirty.Contains(i.Symbol)).ToListAsync(ct);
                lock (_gate)
                {
                    foreach (var inst in instruments) Apply(inst, _states[inst.Symbol]);
                }
                await db.SaveChangesAsync(ct);

                var now = DateTime.UtcNow;
                foreach (var inst in instruments)
                {
                    await broker.ProcessTickAsync(inst.Symbol, inst.Price, ct);
                    await _marketHub.Clients.All.SendAsync("TickUpdate", ApiMappers.ToTickerDto(inst, now), ct);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Publishing Binance ticks failed.");
            }
        }
    }

    // ---------------------------------------------------------------- helpers

    /// <summary>Copies live state onto the tracked entity. Caller holds <see cref="_gate"/>.</summary>
    private static void Apply(Instrument inst, SymbolState s)
    {
        var t = s.Ticker;
        inst.Price = t.LastPrice;
        inst.Change = t.PriceChange;
        inst.ChangePercent = Math.Round(t.PriceChangePercent, 2);
        inst.High = t.HighPrice;
        inst.Low = t.LowPrice;
        inst.Volume = (long)Math.Round(t.Volume);
        inst.AvgVolume = (long)Math.Round(s.Analytics.AvgDailyVolume);
        inst.RelativeVolume = s.Analytics.RelativeVolume(t.Volume);
        inst.Vwap = Math.Round(t.WeightedAvgPrice, 4);
        inst.Atr = s.Analytics.Atr;
        inst.Regime = s.Analytics.Regime;
        inst.Score = DateTime.UtcNow - s.ScoreSetUtc <= ScoreLifetime ? s.Score : 0;
        inst.TickSize = s.Info.TickSize;
        inst.Freshness = FreshnessState.Live;
        inst.LastUpdatedAt = t.EventTimeUtc;
    }

    private async Task PersistCandlesAsync(string symbol, IReadOnlyCollection<BinanceKline> klines, CancellationToken ct)
    {
        if (klines.Count == 0) return;

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

        var from = klines.Min(k => k.OpenTimeUtc);
        var existing = (await db.Candles
                .Where(c => c.Symbol == symbol && c.Timeframe == Timeframe.M15 && c.Timestamp >= from)
                .Select(c => c.Timestamp)
                .ToListAsync(ct))
            .ToHashSet();

        var fresh = klines.Where(k => !existing.Contains(k.OpenTimeUtc))
            .Select(k => CryptoMarketAnalytics.ToCandle(symbol, k))
            .ToList();
        if (fresh.Count == 0) return;

        db.Candles.AddRange(fresh);
        await db.SaveChangesAsync(ct);
    }

    private static List<Candle> ToCandles(string symbol, IEnumerable<BinanceKline> klines) =>
        klines.Select(k => CryptoMarketAnalytics.ToCandle(symbol, k)).ToList();

    /// <summary>UTC-day session VWAP up to and including <paramref name="current"/>. Caller holds the lock.</summary>
    private static decimal CurrentSessionVwap(SymbolState s, BinanceKline current)
    {
        var day = current.OpenTimeUtc.Date;
        decimal quote = current.QuoteVolume, vol = current.Volume;
        for (int i = s.Klines.Count - 1; i >= 0; i--)
        {
            var k = s.Klines[i];
            if (k.OpenTimeUtc.Date != day) break;
            if (k.OpenTimeUtc == current.OpenTimeUtc) continue;
            quote += k.QuoteVolume;
            vol += k.Volume;
        }
        return vol > 0 ? Math.Round(quote / vol, 4) : current.Close;
    }

    public static object ToCandleDto(BinanceKline k, decimal vwap) => new
    {
        time = k.OpenTimeUtc.ToString("O"),
        open = k.Open,
        high = k.High,
        low = k.Low,
        close = k.Close,
        volume = k.Volume,
        vwap
    };
}
