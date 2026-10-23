using System.Globalization;
using System.Text.Json;

namespace ProStock.Infrastructure.MarketData;

/// <summary>
/// Pure JSON → model conversion for Binance Spot REST and WebSocket payloads.
/// Binance encodes prices and quantities as strings to preserve precision, so every
/// numeric field is parsed with the invariant culture into <see cref="decimal"/>.
/// </summary>
public static class BinanceParser
{
    public static IReadOnlyList<BinanceSymbolInfo> ParseExchangeInfo(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var result = new List<BinanceSymbolInfo>();

        foreach (var s in doc.RootElement.GetProperty("symbols").EnumerateArray())
        {
            decimal tickSize = 0.01m, stepSize = 0.00001m;
            foreach (var f in s.GetProperty("filters").EnumerateArray())
            {
                var type = f.GetProperty("filterType").GetString();
                if (type == "PRICE_FILTER") tickSize = Dec(f, "tickSize");
                else if (type == "LOT_SIZE") stepSize = Dec(f, "stepSize");
            }

            result.Add(new BinanceSymbolInfo(
                s.GetProperty("symbol").GetString()!,
                s.GetProperty("baseAsset").GetString()!,
                s.GetProperty("quoteAsset").GetString()!,
                tickSize,
                stepSize));
        }

        return result;
    }

    /// <summary>Parses the array returned by GET /api/v3/ticker/24hr?symbols=[...].</summary>
    public static IReadOnlyList<Binance24hTicker> ParseRestTickers(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var items = root.ValueKind == JsonValueKind.Array ? root.EnumerateArray().ToList() : new List<JsonElement> { root };

        return items.Select(t => new Binance24hTicker(
            t.GetProperty("symbol").GetString()!,
            Dec(t, "lastPrice"),
            Dec(t, "priceChange"),
            Dec(t, "priceChangePercent"),
            Dec(t, "weightedAvgPrice"),
            Dec(t, "openPrice"),
            Dec(t, "highPrice"),
            Dec(t, "lowPrice"),
            Dec(t, "volume"),
            Dec(t, "quoteVolume"),
            Dec(t, "bidPrice"),
            Dec(t, "askPrice"),
            FromMs(t.GetProperty("closeTime").GetInt64())
        )).ToList();
    }

    /// <summary>
    /// Parses GET /api/v3/klines rows:
    /// [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBase, takerQuote, ignore].
    /// </summary>
    public static IReadOnlyList<BinanceKline> ParseRestKlines(string json, DateTime nowUtc)
    {
        using var doc = JsonDocument.Parse(json);
        var result = new List<BinanceKline>();

        foreach (var row in doc.RootElement.EnumerateArray())
        {
            var closeTime = FromMs(row[6].GetInt64());
            result.Add(new BinanceKline(
                FromMs(row[0].GetInt64()),
                closeTime,
                DecStr(row[1]),
                DecStr(row[2]),
                DecStr(row[3]),
                DecStr(row[4]),
                DecStr(row[5]),
                DecStr(row[7]),
                closeTime < nowUtc));
        }

        return result;
    }

    /// <summary>
    /// Parses one frame from the combined stream endpoint (/stream?streams=...),
    /// which wraps every event as {"stream": "...", "data": {...}}. Returns null for
    /// event types this terminal does not consume.
    /// </summary>
    public static BinanceStreamMessage? ParseStreamMessage(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var data = root.TryGetProperty("data", out var wrapped) ? wrapped : root;

        if (!data.TryGetProperty("e", out var eventType)) return null;

        switch (eventType.GetString())
        {
            case "24hrTicker":
                return new BinanceTickerMessage(new Binance24hTicker(
                    data.GetProperty("s").GetString()!,
                    Dec(data, "c"),
                    Dec(data, "p"),
                    Dec(data, "P"),
                    Dec(data, "w"),
                    Dec(data, "o"),
                    Dec(data, "h"),
                    Dec(data, "l"),
                    Dec(data, "v"),
                    Dec(data, "q"),
                    Dec(data, "b"),
                    Dec(data, "a"),
                    FromMs(data.GetProperty("E").GetInt64())));

            case "kline":
                var k = data.GetProperty("k");
                return new BinanceKlineMessage(
                    data.GetProperty("s").GetString()!,
                    k.GetProperty("i").GetString()!,
                    new BinanceKline(
                        FromMs(k.GetProperty("t").GetInt64()),
                        FromMs(k.GetProperty("T").GetInt64()),
                        Dec(k, "o"),
                        Dec(k, "h"),
                        Dec(k, "l"),
                        Dec(k, "c"),
                        Dec(k, "v"),
                        Dec(k, "q"),
                        k.GetProperty("x").GetBoolean()),
                    FromMs(data.GetProperty("E").GetInt64()));

            default:
                return null;
        }
    }

    private static decimal Dec(JsonElement obj, string name) => DecStr(obj.GetProperty(name));

    private static decimal DecStr(JsonElement value) =>
        value.ValueKind == JsonValueKind.Number
            ? value.GetDecimal()
            : decimal.Parse(value.GetString()!, NumberStyles.Float, CultureInfo.InvariantCulture);

    private static DateTime FromMs(long ms) => DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime;
}
