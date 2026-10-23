using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Application.Interfaces.Security;
using ProStock.Infrastructure.Engines;
using ProStock.Infrastructure.MarketData;
using ProStock.Infrastructure.Persistence;
using ProStock.Infrastructure.Security;
using ProStock.Infrastructure.Services;

namespace ProStock.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // 1. Database Configuration (Dynamic SQLite vs PostgreSQL / TimescaleDB)
        var provider = configuration["PROSTOCK_DATABASE_PROVIDER"] ?? "Sqlite";

        if (provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase))
        {
            var pgConn = configuration["PROSTOCK_POSTGRES_CONNECTION"] 
                ?? "Host=localhost;Port=5432;Database=prostock_db;Username=postgres;Password=prostock_password;";
            services.AddDbContext<ProStockDbContext>(options =>
                options.UseNpgsql(pgConn, b => b.MigrationsAssembly(typeof(ProStockDbContext).Assembly.FullName)));
        }
        else
        {
            var sqliteConn = configuration["PROSTOCK_SQLITE_CONNECTION"] ?? "Data Source=prostock_local.db";
            services.AddDbContext<ProStockDbContext>(options =>
                options.UseSqlite(sqliteConn, b => b.MigrationsAssembly(typeof(ProStockDbContext).Assembly.FullName)));
        }

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ProStockDbContext>());

        // 2. Security & Auth Services
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();

        // 3. Trading & Analytics Engines
        services.AddSingleton<ITechnicalIndicatorEngine, TechnicalIndicatorEngine>();
        services.AddSingleton<IRegimeDetectionEngine, RegimeDetectionEngine>();
        services.AddSingleton<IRiskEngine, RiskManagementEngine>();
        services.AddScoped<ISignalEngine, DeterministicSignalEngine>();
        services.AddScoped<IPaperBroker, PaperTradingBroker>();
        services.AddScoped<IBacktestEngine, EventDrivenBacktestEngine>();

        // 4. Alert & AI Explainer Services
        services.AddSingleton<IAlertDispatcher, AlertDispatcher>();
        services.AddSingleton<ILLMExplainerService, OllamaExplainerService>();

        // 5. Binance live crypto market data
        services.AddSingleton(BinanceOptions.FromConfiguration(configuration));
        services.AddSingleton<BinanceRestClient>();
        services.AddSingleton<BinanceStreamClient>();
        services.AddSingleton<MarketFeedHealth>();
        services.AddSingleton<CryptoMarketAnalytics>();

        return services;
    }
}
