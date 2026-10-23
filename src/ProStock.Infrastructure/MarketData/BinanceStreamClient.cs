using System.Net.WebSockets;
using System.Text;

namespace ProStock.Infrastructure.MarketData;

/// <summary>
/// Single connection to Binance's combined stream endpoint carrying the 24h ticker and
/// kline streams for every tracked symbol. <see cref="RunAsync"/> returns or throws when the
/// socket drops; the caller owns reconnection and backoff.
/// </summary>
public sealed class BinanceStreamClient
{
    private readonly BinanceOptions _options;

    public BinanceStreamClient(BinanceOptions options)
    {
        _options = options;
    }

    public Uri BuildStreamUri(string klineInterval)
    {
        var streams = _options.Symbols.SelectMany(s =>
        {
            var lower = s.ToLowerInvariant();
            return new[] { $"{lower}@ticker", $"{lower}@kline_{klineInterval}" };
        });
        return new Uri($"{_options.StreamBaseUrl}/stream?streams={string.Join('/', streams)}");
    }

    public async Task RunAsync(
        string klineInterval,
        Action onConnected,
        Func<BinanceStreamMessage, Task> onMessage,
        CancellationToken ct)
    {
        using var socket = new ClientWebSocket();
        // Binance pings every 20s and drops clients that don't pong; ClientWebSocket answers
        // pings automatically. KeepAlive adds our own pings so dead links are noticed sooner.
        socket.Options.KeepAliveInterval = TimeSpan.FromSeconds(15);

        await socket.ConnectAsync(BuildStreamUri(klineInterval), ct);
        onConnected();

        var buffer = new byte[16 * 1024];
        using var frame = new MemoryStream();

        while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            frame.SetLength(0);
            WebSocketReceiveResult result;
            do
            {
                result = await socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    throw new WebSocketException(
                        $"Binance closed the stream ({result.CloseStatus}: {result.CloseStatusDescription}).");
                }
                frame.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            var json = Encoding.UTF8.GetString(frame.GetBuffer(), 0, (int)frame.Length);
            var message = BinanceParser.ParseStreamMessage(json);
            if (message != null)
            {
                await onMessage(message);
            }
        }
    }
}
