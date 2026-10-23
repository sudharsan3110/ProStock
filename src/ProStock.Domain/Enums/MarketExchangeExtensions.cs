namespace ProStock.Domain.Enums;

public static class MarketExchangeExtensions
{
    public static bool IsCrypto(this MarketExchange market) => market == MarketExchange.Binance;

    public static bool IsUs(this MarketExchange market) =>
        market is MarketExchange.NYSE or MarketExchange.NASDAQ;

    /// <summary>Display symbol for the currency an instrument on this exchange is quoted in.</summary>
    public static string CurrencySymbol(this MarketExchange market) =>
        market.IsCrypto() || market.IsUs() ? "$" : "₹";
}
