using System.Net;
using System.Text.Json;

namespace ProStock.Infrastructure.MarketData;

/// <summary>Client for Binance Spot public market-data endpoints (no API key required).</summary>
public sealed class BinanceRestClient
{
    private readonly HttpClient _http;

    public BinanceRestClient(BinanceOptions options)
    {
        _http = new HttpClient
        {
            BaseAddress = new Uri(options.RestBaseUrl + "/"),
            Timeout = TimeSpan.FromSeconds(10)
        };
    }

    public async Task<IReadOnlyList<BinanceSymbolInfo>> GetSymbolInfoAsync(IEnumerable<string> symbols, CancellationToken ct = default)
    {
        var json = await GetAsync($"api/v3/exchangeInfo?symbols={SymbolsParam(symbols)}", ct);
        return BinanceParser.ParseExchangeInfo(json);
    }

    public async Task<IReadOnlyList<Binance24hTicker>> Get24hTickersAsync(IEnumerable<string> symbols, CancellationToken ct = default)
    {
        var json = await GetAsync($"api/v3/ticker/24hr?symbols={SymbolsParam(symbols)}", ct);
        return BinanceParser.ParseRestTickers(json);
    }

    public async Task<IReadOnlyList<BinanceKline>> GetKlinesAsync(string symbol, string interval, int limit, CancellationToken ct = default)
    {
        var json = await GetAsync($"api/v3/klines?symbol={Uri.EscapeDataString(symbol)}&interval={interval}&limit={Math.Clamp(limit, 1, 1000)}", ct);
        return BinanceParser.ParseRestKlines(json, DateTime.UtcNow);
    }

    private async Task<string> GetAsync(string path, CancellationToken ct)
    {
        using var response = await _http.GetAsync(path, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (response.StatusCode == HttpStatusCode.UnavailableForLegalReasons)
        {
            throw new BinanceApiException(
                "Binance rejected the request from this region (HTTP 451). " +
                "Set PROSTOCK_BINANCE_REST_URL=https://data-api.binance.vision and " +
                "PROSTOCK_BINANCE_STREAM_URL=wss://data-stream.binance.vision in .env.");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new BinanceApiException($"Binance {path.Split('?')[0]} returned {(int)response.StatusCode}: {ExtractMessage(body)}");
        }

        return body;
    }

    private static string SymbolsParam(IEnumerable<string> symbols) =>
        Uri.EscapeDataString(JsonSerializer.Serialize(symbols.Select(s => s.ToUpperInvariant())));

    private static string ExtractMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("msg", out var msg) ? msg.GetString() ?? body : body;
        }
        catch (JsonException)
        {
            return body.Length > 200 ? body[..200] : body;
        }
    }
}

public sealed class BinanceApiException(string message) : Exception(message);
