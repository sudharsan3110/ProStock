namespace ProStock.Infrastructure.MarketData;

public enum FeedConnectionState
{
    Disabled,
    Connecting,
    Connected,
    Reconnecting,
    Disconnected
}

public record MarketFeedSnapshot(
    string ProviderName,
    FeedConnectionState State,
    double LatencyMs,
    double? LastMessageAgeSec,
    long MessagesReceived,
    int Reconnects,
    DateTime? ConnectedAtUtc,
    string? LastError);

/// <summary>Thread-safe live status of the Binance feed, read by the health endpoint.</summary>
public sealed class MarketFeedHealth
{
    private readonly object _gate = new();
    private FeedConnectionState _state = FeedConnectionState.Connecting;
    private DateTime? _connectedAtUtc;
    private DateTime? _lastMessageUtc;
    private double _latencyMs;
    private long _messages;
    private int _reconnects;
    private string? _lastError;

    public string ProviderName => "Binance Spot Stream";

    public void MarkDisabled()
    {
        lock (_gate) _state = FeedConnectionState.Disabled;
    }

    public void MarkConnected()
    {
        lock (_gate)
        {
            _state = FeedConnectionState.Connected;
            _connectedAtUtc = DateTime.UtcNow;
            _lastError = null;
        }
    }

    public void MarkFailure(string error, bool willRetry)
    {
        lock (_gate)
        {
            _state = willRetry ? FeedConnectionState.Reconnecting : FeedConnectionState.Disconnected;
            _lastError = error;
            if (willRetry) _reconnects++;
        }
    }

    public void RecordMessage(DateTime eventTimeUtc)
    {
        var now = DateTime.UtcNow;
        lock (_gate)
        {
            _messages++;
            _lastMessageUtc = now;
            // Event time is stamped by Binance; the difference is network + processing latency
            // (plus any local clock skew, so clamp at zero).
            _latencyMs = Math.Max(0, (now - eventTimeUtc).TotalMilliseconds);
        }
    }

    public MarketFeedSnapshot Snapshot()
    {
        lock (_gate)
        {
            return new MarketFeedSnapshot(
                ProviderName,
                _state,
                Math.Round(_latencyMs, 1),
                _lastMessageUtc.HasValue ? Math.Round((DateTime.UtcNow - _lastMessageUtc.Value).TotalSeconds, 1) : null,
                _messages,
                _reconnects,
                _connectedAtUtc,
                _lastError);
        }
    }
}
