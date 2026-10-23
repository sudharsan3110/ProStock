using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces.Security;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ProStockDbContext context, IPasswordHasher hasher)
    {
        await context.Database.EnsureCreatedAsync();

        // 1. Seed Admin User
        if (!await context.Users.AnyAsync())
        {
            var (hash, salt) = hasher.HashPassword("AdminProStockPassword2026!");
            var admin = new User
            {
                Email = "admin@prostock.local",
                FullName = "Lead Quant Admin",
                PasswordHash = hash,
                Salt = salt,
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var paperAccount = new PaperAccount
            {
                UserId = admin.Id,
                AccountNumber = "PRO-ADMIN-001",
                Currency = "INR",
                TotalEquity = 1000000m,
                CashBalance = 1000000m,
                PortfolioHeatPercent = 14.5m
            };

            admin.PaperAccounts.Add(paperAccount);
            context.Users.Add(admin);
            await context.SaveChangesAsync();
        }

        // 2. Seed Instruments
        if (!await context.Instruments.AnyAsync())
        {
            var instruments = new[]
            {
                new Instrument { Symbol = "RELIANCE", Name = "Reliance Industries Ltd", Exchange = "NSE", Market = MarketExchange.NSE, Sector = "Energy", Price = 2482.40m, Change = 24.50m, ChangePercent = 1.00m, High = 2498.00m, Low = 2465.00m, Volume = 8420100, AvgVolume = 6200000, RelativeVolume = 1.36m, Vwap = 2478.20m, Atr = 32.50m, Regime = RegimeType.TrendingBull, Score = 88 },
                new Instrument { Symbol = "TCS", Name = "Tata Consultancy Services", Exchange = "NSE", Market = MarketExchange.NSE, Sector = "IT", Price = 4120.00m, Change = 58.20m, ChangePercent = 1.43m, High = 4140.00m, Low = 4080.00m, Volume = 3120500, AvgVolume = 2400000, RelativeVolume = 1.30m, Vwap = 4105.00m, Atr = 45.00m, Regime = RegimeType.TrendingBull, Score = 82 },
                new Instrument { Symbol = "INFY", Name = "Infosys Ltd", Exchange = "NSE", Market = MarketExchange.NSE, Sector = "IT", Price = 1890.50m, Change = -12.40m, ChangePercent = -0.65m, High = 1910.00m, Low = 1882.00m, Volume = 6890000, AvgVolume = 7100000, RelativeVolume = 0.97m, Vwap = 1895.00m, Atr = 22.00m, Regime = RegimeType.Ranging, Score = 65 },
                new Instrument { Symbol = "HDFCBANK", Name = "HDFC Bank Ltd", Exchange = "NSE", Market = MarketExchange.NSE, Sector = "Banking", Price = 1680.00m, Change = 8.10m, ChangePercent = 0.48m, High = 1692.00m, Low = 1674.00m, Volume = 12450000, AvgVolume = 11000000, RelativeVolume = 1.13m, Vwap = 1682.00m, Atr = 18.50m, Regime = RegimeType.TrendingBull, Score = 79 },
                new Instrument { Symbol = "NIFTY 50", Name = "Nifty 50 Benchmark Index", Exchange = "NSE", Market = MarketExchange.NSE, Sector = "Benchmark", Price = 25180.00m, Change = 120.40m, ChangePercent = 0.48m, High = 25220.00m, Low = 25090.00m, Volume = 45200000, AvgVolume = 42000000, RelativeVolume = 1.08m, Vwap = 25140.00m, Atr = 140.00m, Regime = RegimeType.TrendingBull, Score = 85 },
                // Crypto instruments (BTCUSDT, ETHUSDT, SOLUSDT, ...) are created and kept live by
                // BinanceMarketDataWorker from PROSTOCK_BINANCE_SYMBOLS — nothing to seed here.
                new Instrument { Symbol = "AAPL", Name = "Apple Inc", Exchange = "NASDAQ", Market = MarketExchange.NASDAQ, Sector = "Technology", Price = 232.50m, Change = 3.20m, ChangePercent = 1.40m, High = 234.00m, Low = 229.80m, Volume = 52400000, AvgVolume = 48000000, RelativeVolume = 1.09m, Vwap = 231.80m, Atr = 3.80m, Regime = RegimeType.TrendingBull, Score = 86 }
            };

            context.Instruments.AddRange(instruments);
        }

        // 3. Seed Strategies
        if (!await context.Strategies.AnyAsync())
        {
            var strategies = new[]
            {
                new StrategyDefinition { Name = "TrendPullbackVWAP", Version = "2.1.0", State = StrategyState.Active, Author = "ProStock Quant Team", Description = "Enters on pullback to VWAP within verified Trending Bull regimes.", WinRate = 68.4m, Sharpe = 2.35m, SignalsLast30d = 34, DecayRisk = "LOW" },
                new StrategyDefinition { Name = "BreakoutVolumeConfirmation", Version = "1.4.0", State = StrategyState.Active, Author = "ProStock Quant Team", Description = "Capitalizes on 20-bar structural range breakouts with RVOL > 1.5x confirmation.", WinRate = 62.1m, Sharpe = 1.95m, SignalsLast30d = 28, DecayRisk = "LOW" },
                new StrategyDefinition { Name = "SuperTrendRegimeContinuation", Version = "3.0.0", State = StrategyState.Active, Author = "ProStock Quant Team", Description = "Multi-timeframe trend continuation following SuperTrend direction flip.", WinRate = 64.8m, Sharpe = 2.10m, SignalsLast30d = 41, DecayRisk = "LOW" }
            };

            context.Strategies.AddRange(strategies);
        }

        // 4. Seed Historical Candles if empty
        if (!await context.Candles.AnyAsync())
        {
            var baseTime = DateTime.UtcNow.AddHours(-16);
            // Crypto history comes from Binance klines, never synthetic data.
            var instList = await context.Instruments.Where(i => i.Market != MarketExchange.Binance).ToListAsync();
            var allCandles = new List<Candle>();

            foreach (var inst in instList)
            {
                decimal price = inst.Price;
                for (int i = 0; i < 60; i++)
                {
                    decimal delta = (decimal)(new Random(i + inst.Symbol.Length).NextDouble() - 0.48) * (price * 0.005m);
                    decimal open = price;
                    decimal close = Math.Round(price + delta, 2);
                    decimal high = Math.Round(Math.Max(open, close) + (decimal)new Random(i * 2).NextDouble() * (price * 0.002m), 2);
                    decimal low = Math.Round(Math.Min(open, close) - (decimal)new Random(i * 3).NextDouble() * (price * 0.002m), 2);
                    long vol = new Random(i * 5).Next(25000, 180000);

                    allCandles.Add(new Candle
                    {
                        Symbol = inst.Symbol,
                        Timeframe = Timeframe.M15,
                        Timestamp = baseTime.AddMinutes(i * 15),
                        Open = open,
                        High = high,
                        Low = low,
                        Close = close,
                        Volume = vol,
                        Vwap = Math.Round((high + low + close) / 3m, 2)
                    });
                    price = close;
                }
            }

            context.Candles.AddRange(allCandles);
        }

        // 5. Seed Initial High-Conviction Signals
        if (!await context.Signals.AnyAsync())
        {
            var signals = new[]
            {
                new Signal
                {
                    Symbol = "RELIANCE",
                    Market = MarketExchange.NSE,
                    Direction = Direction.Long,
                    Timeframe = Timeframe.M15,
                    StrategyName = "TrendPullbackVWAP",
                    StrategyVersion = "2.1.0",
                    StrategyAuthor = "ProStock Quant Team",
                    Regime = RegimeType.TrendingBull,
                    Freshness = FreshnessState.Live,
                    Mode = SignalMode.Live,
                    Status = SignalStatus.Active,
                    EntryMin = 2475.00m,
                    EntryMax = 2485.00m,
                    CurrentPrice = 2482.40m,
                    StopLoss = 2450.00m,
                    Target1 = 2515.00m,
                    Target2 = 2540.00m,
                    Target3 = 2570.00m,
                    RiskReward = 2.1m,
                    SuggestedQty = 75,
                    DollarRisk = 2430.00m,
                    HeatImpactPercent = 0.24m,
                    TotalScore = 88m,
                    FactorCoverage = 100m,
                    FactorsJson = "[{\"name\":\"Trend Stack (20/50 EMA)\",\"score\":25,\"max\":25},{\"name\":\"VWAP Pullback Absorption\",\"score\":23,\"max\":25},{\"name\":\"RVOL Surge (1.36x)\",\"score\":20,\"max\":20},{\"name\":\"ATR Volatility Expansion\",\"score\":10,\"max\":15},{\"name\":\"Regime Alignment (Bull)\",\"score\":10,\"max\":15}]",
                    GatesPassedJson = "[\"Data Quality > 99%\",\"No Blackout News Event Active\",\"Spread < 0.05% ATR\",\"Portfolio Heat Cap < 30%\",\"Exchange Session Active\"]",
                    ReasonsJson = "[\"Multi-timeframe trend continuation in Trending Bull regime\",\"20 EMA stacked above 50 EMA with positive slope\",\"Absorption wick identified at session VWAP with RVOL 1.36x\",\"Risk:Reward 1:2.1 to Target 1\"]",
                    InvalidationJson = "[\"15m candle close below 2450.00 SL\",\"SuperTrend bearish flip on 1h timeframe\",\"Macro blackout event announced\"]",
                    Summary = "High-conviction trend pullback long on RELIANCE following VWAP support reclaim with institutional volume surge.",
                    GroundingFactsJson = "[\"Price currently 2482.40, VWAP at 2478.20\",\"ATR is 32.50 INR, SL set at 2450 (-0.99R)\",\"Target 1 at 2515 (+1.00R), Target 2 at 2540 (+1.77R)\"]",
                    HashSha256 = "c8f921ab3948d910efb17849c0291e0a814a012b10934857201cba810482910a",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-12)
                }
            };

            context.Signals.AddRange(signals);
        }

        // 5b. Repair databases created by earlier builds:
        //   - drop the fabricated BTCUSDT seed signal (priced at a static 68,420);
        //   - reset day-change figures corrupted by the old simulator, which measured every
        //     instrument's change against a fixed 2,450 reference price.
        const string legacyFakeCryptoSignalHash = "b91048f0291e0a814a012b10934857201cba810482910ac8f921ab3948d910ef";
        await context.Signals.Where(s => s.HashSha256 == legacyFakeCryptoSignalHash).ExecuteDeleteAsync();

        var simulated = await context.Instruments.Where(i => i.Market != MarketExchange.Binance).ToListAsync();
        foreach (var inst in simulated.Where(i => Math.Abs(i.Price - i.Change - 2450m) < 0.01m))
        {
            inst.Change = 0;
            inst.ChangePercent = 0;
        }

        // 6. Seed Initial Positions and Orders for Paper Account
        var account = await context.PaperAccounts.FirstOrDefaultAsync();
        if (account != null && !await context.PaperPositions.AnyAsync())
        {
            var p1 = new PaperPosition
            {
                PaperAccountId = account.Id,
                Symbol = "RELIANCE",
                Direction = Direction.Long,
                Quantity = 75,
                AvgEntryPrice = 2470.00m,
                CurrentPrice = 2482.40m,
                StopLoss = 2450.00m,
                TargetPrice = 2520.00m,
                RMultiple = 0.62m,
                OpenedAt = DateTime.UtcNow.AddHours(-2)
            };

            var p2 = new PaperPosition
            {
                PaperAccountId = account.Id,
                Symbol = "TCS",
                Direction = Direction.Long,
                Quantity = 25,
                AvgEntryPrice = 4095.00m,
                CurrentPrice = 4120.00m,
                StopLoss = 4060.00m,
                TargetPrice = 4200.00m,
                RMultiple = 0.71m,
                OpenedAt = DateTime.UtcNow.AddHours(-4)
            };

            var o1 = new PaperOrder
            {
                PaperAccountId = account.Id,
                Symbol = "RELIANCE",
                Side = OrderSide.Buy,
                Type = OrderType.Limit,
                Quantity = 75,
                Price = 2470.00m,
                Status = OrderStatus.Filled,
                FilledQuantity = 75,
                AverageFillPrice = 2470.00m,
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                FilledAt = DateTime.UtcNow.AddHours(-2)
            };

            var o2 = new PaperOrder
            {
                PaperAccountId = account.Id,
                Symbol = "TCS",
                Side = OrderSide.Buy,
                Type = OrderType.Limit,
                Quantity = 25,
                Price = 4095.00m,
                Status = OrderStatus.Filled,
                FilledQuantity = 25,
                AverageFillPrice = 4095.00m,
                CreatedAt = DateTime.UtcNow.AddHours(-4),
                FilledAt = DateTime.UtcNow.AddHours(-4)
            };

            context.PaperPositions.AddRange(p1, p2);
            context.PaperOrders.AddRange(o1, o2);

            account.DailyPnL = 1555.00m;
            account.DailyPnLPercent = 0.16m;
            account.UnrealizedPnL = 1555.00m;
            account.MarginUsed = (75 * 2470.00m) + (25 * 4095.00m);
        }

        await context.SaveChangesAsync();
    }
}
