using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Services;

public class AlertDispatcher : IAlertDispatcher
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public AlertDispatcher(IConfiguration config)
    {
        _config = config;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    }

    public async Task DispatchSignalAlertAsync(Signal signal, CancellationToken ct = default)
    {
        var telegramToken = _config["PROSTOCK_TELEGRAM_BOT_TOKEN"];
        var chatId = _config["PROSTOCK_TELEGRAM_CHAT_ID"];
        var discordWebhook = _config["PROSTOCK_DISCORD_WEBHOOK_URL"];

        string cur = signal.Market.CurrencySymbol();
        string isLong = signal.Direction == Domain.Enums.Direction.Long ? "🟢 LONG" : "🔴 SHORT";
        string message = $@"🚨 *PROSTOCK ALGO SIGNAL* 🚨
{isLong}: *{signal.Symbol}* ({signal.Market})
Strategy: `{signal.StrategyName}`
Entry: {cur}{signal.EntryMin:N2} - {cur}{signal.EntryMax:N2}
Stop Loss: {cur}{signal.StopLoss:N2}
Target 1: {cur}{signal.Target1:N2} (1.5R)
Target 2: {cur}{signal.Target2:N2} (2.5R)
Setup Score: *{signal.TotalScore}/100*
Regime: `{signal.Regime}`";

        // Dispatch Telegram
        if (!string.IsNullOrEmpty(telegramToken) && !string.IsNullOrEmpty(chatId) && !telegramToken.Contains("YOUR_"))
        {
            try
            {
                var payload = new { chat_id = chatId, text = message, parse_mode = "Markdown" };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"https://api.telegram.org/bot{telegramToken}/sendMessage", content, ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AlertDispatcher] Telegram dispatch failed: {ex.Message}");
            }
        }

        // Dispatch Discord Webhook
        if (!string.IsNullOrEmpty(discordWebhook) && !discordWebhook.Contains("YOUR_"))
        {
            try
            {
                var discordPayload = new
                {
                    content = $"**PROSTOCK ALERT** — {isLong} on `{signal.Symbol}`",
                    embeds = new[]
                    {
                        new
                        {
                            title = $"{signal.Symbol} - {signal.Direction} Signal ({signal.StrategyName})",
                            color = signal.Direction == Domain.Enums.Direction.Long ? 3066993 : 15158332,
                            description = signal.Summary,
                            fields = new[]
                            {
                                new { name = "Entry Zone", value = $"{cur}{signal.EntryMin:N2} - {cur}{signal.EntryMax:N2}", inline = true },
                                new { name = "Stop Loss", value = $"{cur}{signal.StopLoss:N2}", inline = true },
                                new { name = "Target 1", value = $"{cur}{signal.Target1:N2}", inline = true },
                                new { name = "Setup Score", value = $"{signal.TotalScore}/100", inline = true },
                                new { name = "Risk:Reward", value = $"{signal.RiskReward}:1", inline = true }
                            }
                        }
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(discordPayload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync(discordWebhook, content, ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AlertDispatcher] Discord dispatch failed: {ex.Message}");
            }
        }
    }

    public async Task DispatchCircuitBreakerAlertAsync(string reason, decimal drawdownPercent, CancellationToken ct = default)
    {
        var telegramToken = _config["PROSTOCK_TELEGRAM_BOT_TOKEN"];
        var chatId = _config["PROSTOCK_TELEGRAM_CHAT_ID"];

        string message = $@"🛑 *CIRCUIT BREAKER TRIPPED! TRADING HALTED!* 🛑
Reason: {reason}
Drawdown: *{drawdownPercent:F2}%*
System has frozen all order execution for capital protection.";

        if (!string.IsNullOrEmpty(telegramToken) && !string.IsNullOrEmpty(chatId) && !telegramToken.Contains("YOUR_"))
        {
            try
            {
                var payload = new { chat_id = chatId, text = message, parse_mode = "Markdown" };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                await _httpClient.PostAsync($"https://api.telegram.org/bot{telegramToken}/sendMessage", content, ct);
            }
            catch { }
        }
    }
}
