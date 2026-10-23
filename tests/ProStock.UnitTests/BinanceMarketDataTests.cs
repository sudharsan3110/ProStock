using Microsoft.Extensions.Configuration;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;
using ProStock.Infrastructure.Engines;
using ProStock.Infrastructure.MarketData;
using Xunit;

namespace ProStock.UnitTests;

public class BinanceMarketDataTests
{
    [Fact]
    public void ParseStreamMessage_Ticker_ReadsCombinedStreamEnvelope()
    {
        const string json = """
        {"stream":"btcusdt@ticker","data":{"e":"24hrTicker","E":1792771680007,"s":"BTCUSDT",
         "p":"52.10000000","P":"0.064","w":"81547.20866638","x":"81671.85000000","c":"81723.96000000",
         "Q":"0.01855000","b":"81723.95000000","B":"5.5","a":"81723.96000000","A":"1.0",
         "o":"81671.86000000","h":"82060.88000000","l":"80939.54000000","v":"12862.22100000",
         "q":"1048878219.80008690","O":1792685280007,"C":1792771680007,"F":1,"L":2,"n":2}}
        """;

        var msg = Assert.IsType<BinanceTickerMessage>(BinanceParser.ParseStreamMessage(json));

        Assert.Equal("BTCUSDT", msg.Symbol);
        Assert.Equal(81723.96m, msg.Ticker.LastPrice);
        Assert.Equal(0.064m, msg.Ticker.PriceChangePercent);
        Assert.Equal(81547.20866638m, msg.Ticker.WeightedAvgPrice);
        Assert.Equal(12862.221m, msg.Ticker.Volume);
        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(1792771680007).UtcDateTime, msg.EventTimeUtc);
    }

    [Fact]
    public void ParseStreamMessage_Kline_ReadsClosedFlagAndOhlcv()
    {
        const string json = """
        {"stream":"ethusdt@kline_15m","data":{"e":"kline","E":1792772099999,"s":"ETHUSDT",
         "k":{"t":1792771200000,"T":1792772099999,"s":"ETHUSDT","i":"15m","f":1,"L":2,
              "o":"2400.10","c":"2408.03","h":"2410.00","l":"2398.71","v":"2137.5064","n":10,
              "x":true,"q":"5137000.25","V":"1","Q":"1","B":"0"}}}
        """;

        var msg = Assert.IsType<BinanceKlineMessage>(BinanceParser.ParseStreamMessage(json));

        Assert.Equal("ETHUSDT", msg.Symbol);
        Assert.Equal("15m", msg.Interval);
        Assert.True(msg.Kline.IsClosed);
        Assert.Equal(2400.10m, msg.Kline.Open);
        Assert.Equal(2408.03m, msg.Kline.Close);
        Assert.Equal(2137.5064m, msg.Kline.Volume);
        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(1792771200000).UtcDateTime, msg.Kline.OpenTimeUtc);
    }

    [Fact]
    public void ParseStreamMessage_UnknownEvent_ReturnsNull()
    {
        Assert.Null(BinanceParser.ParseStreamMessage("""{"stream":"x","data":{"e":"aggTrade","s":"BTCUSDT"}}"""));
        Assert.Null(BinanceParser.ParseStreamMessage("""{"result":null,"id":1}"""));
    }

    [Fact]
    public void ParseRestKlines_MarksOnlyPastBarsClosed()
    {
        var now = new DateTime(2026, 10, 23, 16, 5, 0, DateTimeKind.Utc);
        long Ms(DateTime d) => new DateTimeOffset(d).ToUnixTimeMilliseconds();
        var t0 = new DateTime(2026, 10, 23, 15, 45, 0, DateTimeKind.Utc);
        var t1 = t0.AddMinutes(15);

        var json = $"""
        [[{Ms(t0)},"100","110","95","105","10.5",{Ms(t0.AddMinutes(15).AddMilliseconds(-1))},"1050","5","1","1","0"],
         [{Ms(t1)},"105","106","104","105.5","2",{Ms(t1.AddMinutes(15).AddMilliseconds(-1))},"211","1","1","1","0"]]
        """;

        var klines = BinanceParser.ParseRestKlines(json, now);

        Assert.Equal(2, klines.Count);
        Assert.True(klines[0].IsClosed);
        Assert.False(klines[1].IsClosed);
        Assert.Equal(10.5m, klines[0].Volume);
        Assert.Equal(1050m, klines[0].QuoteVolume);
    }

    [Fact]
    public void ParseExchangeInfo_ReadsAssetsAndTickSize()
    {
        const string json = """
        {"symbols":[{"symbol":"SOLUSDT","baseAsset":"SOL","quoteAsset":"USDT","filters":[
          {"filterType":"PRICE_FILTER","minPrice":"0.01","maxPrice":"10000","tickSize":"0.01000000"},
          {"filterType":"LOT_SIZE","minQty":"0.001","maxQty":"9000","stepSize":"0.00100000"}]}]}
        """;

        var info = Assert.Single(BinanceParser.ParseExchangeInfo(json));

        Assert.Equal("SOL", info.BaseAsset);
        Assert.Equal("USDT", info.QuoteAsset);
        Assert.Equal(0.01m, info.TickSize);
        Assert.Equal(0.001m, info.StepSize);
        Assert.Equal("Solana / USDT", CryptoMarketAnalytics.DisplayName(info));
    }

    [Fact]
    public void SessionVwap_ResetsAtUtcMidnight()
    {
        var lateDay = new DateTime(2026, 10, 22, 23, 45, 0, DateTimeKind.Utc);
        var klines = new[]
        {
            Kline(lateDay, close: 100, volume: 1, quote: 100),
            Kline(lateDay.AddMinutes(15), close: 200, volume: 1, quote: 200),   // new UTC day
            Kline(lateDay.AddMinutes(30), close: 300, volume: 3, quote: 900),
        };

        var vwap = CryptoMarketAnalytics.SessionVwap(klines, resetDaily: true);

        Assert.Equal(100m, vwap[0]);
        Assert.Equal(200m, vwap[1]);
        Assert.Equal(275m, vwap[2]);   // (200 + 900) / (1 + 3)

        var continuous = CryptoMarketAnalytics.SessionVwap(klines, resetDaily: false);
        Assert.Equal(240m, continuous[2]);   // (100 + 200 + 900) / 5
    }

    [Fact]
    public void Compute_RelativeVolumeUsesCompletedDailySessionsOnly()
    {
        var indicators = new TechnicalIndicatorEngine();
        var analytics = new CryptoMarketAnalytics(indicators, new RegimeDetectionEngine(indicators));

        var start = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
        var daily = Enumerable.Range(0, 20)
            .Select(i => Kline(start.AddDays(i), close: 100, volume: 1000, quote: 100_000, closed: true))
            .Append(Kline(start.AddDays(20), close: 100, volume: 50, quote: 5000, closed: false))   // in-progress day
            .ToList();

        var candles = Enumerable.Range(0, 60)
            .Select(i => new Candle { Symbol = "BTCUSDT", Timestamp = start.AddMinutes(15 * i), Open = 100, High = 101, Low = 99, Close = 100, Volume = 10 })
            .ToList();

        var result = analytics.Compute(candles, daily);

        Assert.Equal(1000m, result.AvgDailyVolume);
        Assert.Equal(1.5m, result.RelativeVolume(1500m));
        Assert.True(result.Atr > 0);
        Assert.Equal(RegimeType.Ranging, result.Regime);   // flat series
    }

    [Fact]
    public void BinanceOptions_ParsesSymbolList()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PROSTOCK_BINANCE_SYMBOLS"] = " btcusdt, ETHUSDT ,solusdt,BTCUSDT ",
                ["PROSTOCK_BINANCE_REST_URL"] = "https://data-api.binance.vision/"
            })
            .Build();

        var options = BinanceOptions.FromConfiguration(config);

        Assert.Equal(new[] { "BTCUSDT", "ETHUSDT", "SOLUSDT" }, options.Symbols);
        Assert.Equal("https://data-api.binance.vision", options.RestBaseUrl);
        Assert.True(options.IsTracked("ethusdt"));
        Assert.False(options.IsTracked("RELIANCE"));
    }

    [Fact]
    public void CurrencySymbol_DollarForCryptoAndUs_RupeeForIndia()
    {
        Assert.Equal("$", MarketExchange.Binance.CurrencySymbol());
        Assert.Equal("$", MarketExchange.NASDAQ.CurrencySymbol());
        Assert.Equal("₹", MarketExchange.NSE.CurrencySymbol());
    }

    private static BinanceKline Kline(DateTime open, decimal close, decimal volume, decimal quote, bool closed = true) =>
        new(open, open.AddMinutes(15).AddMilliseconds(-1), close, close, close, close, volume, quote, closed);
}
