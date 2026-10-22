namespace ProStock.Domain.Enums;

public enum MarketExchange
{
    NSE,
    BSE,
    MCX,
    NYSE,
    NASDAQ,
    Binance
}

public enum AssetClass
{
    Equity,
    Commodity,
    Crypto,
    Forex
}

public enum Direction
{
    Long,
    Short
}

public enum Timeframe
{
    M1,
    M5,
    M15,
    H1,
    H4,
    D1
}

public enum RegimeType
{
    TrendingBull,
    TrendingBear,
    Ranging,
    VolatilityExpansion,
    VolatilityCompression
}

public enum FreshnessState
{
    Live,
    Delay3s,
    Delayed,
    Closed,
    Stale
}

public enum SignalStatus
{
    Active,
    Expired,
    Target1Hit,
    Target2Hit,
    Target3Hit,
    StoppedOut
}

public enum SignalMode
{
    Live,
    Shadow
}

public enum OrderSide
{
    Buy,
    Sell
}

public enum OrderType
{
    Market,
    Limit,
    Stop,
    StopLimit
}

public enum OrderStatus
{
    Pending,
    Filled,
    Cancelled,
    Rejected
}

public enum UserRole
{
    Admin,
    Trader,
    Viewer
}

public enum StrategyState
{
    Active,
    Shadow,
    Draft,
    Retired
}
