namespace ProStock.Api.Contracts;

/// <summary>
/// Regular-session clocks shown in the top bar. Weekends are handled; exchange holidays are not.
/// </summary>
public static class MarketSessions
{
    private sealed record SessionDef(string Market, string TimeZoneId, string Label, TimeSpan Open, TimeSpan Close);

    private static readonly SessionDef[] Sessions =
    {
        new("NSE", "Asia/Kolkata", "IST", new TimeSpan(9, 15, 0), new TimeSpan(15, 30, 0)),
        new("US", "America/New_York", "ET", new TimeSpan(9, 30, 0), new TimeSpan(16, 0, 0))
    };

    public static IEnumerable<object> Current(DateTime utcNow)
    {
        foreach (var def in Sessions)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(def.TimeZoneId);
            var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
            bool tradingDay = local.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);
            bool open = tradingDay && local.TimeOfDay >= def.Open && local.TimeOfDay < def.Close;

            DateTime next;
            if (open)
            {
                next = local.Date + def.Close;
            }
            else
            {
                next = local.TimeOfDay < def.Open && tradingDay ? local.Date + def.Open : local.Date.AddDays(1) + def.Open;
                while (next.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) next = next.AddDays(1);
            }

            yield return new
            {
                market = def.Market,
                status = open ? "OPEN" : "CLOSED",
                timeRemaining = FormatSpan(next - local),
                timezone = def.Label,
                nextSession = $"{(open ? "Closes" : "Opens")} {next:ddd HH:mm} {def.Label}"
            };
        }

        yield return new
        {
            market = "CRYPTO",
            status = "OPEN",
            timeRemaining = "24/7",
            timezone = "UTC",
            nextSession = "Always open"
        };
    }

    private static string FormatSpan(TimeSpan span) =>
        span.TotalHours >= 24 ? $"{(int)span.TotalDays}d {span.Hours}h" : $"{(int)span.TotalHours}h {span.Minutes}m";
}
