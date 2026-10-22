# ProStock — Master Product Specification & System Blueprint

> **Notice for AI Reviewers (Claude / External Architect):**  
> This document is the comprehensive functional, technical, and architectural specification for **ProStock**, an institutional-grade, personal multi-market algorithmic market analysis, signal generation, backtesting, and paper-trading platform.  
> **Your Mandate:** Please review this specification thoroughly. Evaluate, enhance, critique, and prioritize the proposed features, identify any operational or architectural gaps, resolve trade-offs in Section 9 (Feature Decision & Evaluation Matrix), and suggest enhancements for maximum resilience, analytical edge, and developer velocity.

---

## 1. Executive Summary & Core Philosophy

### 1.1 Project Goal
ProStock is a **personal-use, 24/7 autonomous market-analysis, signal-generation, and paper-trading platform** built for a single quantitative trader. It continuously monitors multiple financial markets, detects regime changes, computes deterministic entry/exit signals with explicit mathematical justifications, runs continuous backtests, simulates execution in paper portfolios, and alerts the user via multiple notification channels.

### 1.2 Non-Negotiable Core Principles
1. **Deterministic Rule Engine (No Black-Box Trading):** The LLM/AI is strictly prohibited from generating raw trading orders or signals. Mathematical indicators, multi-timeframe rules, statistical filters, and risk models must be 100% deterministic, testable, and auditable.
2. **LLM as Explainer & Synthesizer Only:** AI / LLMs are used solely as a natural-language copilot to synthesize news sentiment, explain why a deterministic signal fired, generate post-trade analysis, and answer queries over stored market telemetry.
3. **Paper-Trading First (Zero Automatic Live Capital):** Version 1 strictly supports research, backtesting, alerting, and simulated virtual execution. No broker live-trading keys with execution permissions are permitted until multi-week statistical validation has concluded.
4. **Resilience & Stale Data Awareness:** If a market data feed drops, disconnects, or lags, the system must immediately flag data as stale, suspend signal generation for that asset, trigger health alerts, and never generate phantom trades on outdated prices.
5. **Pluggable Provider Architecture:** Business logic, signal math, and storage must never depend directly on a specific broker or provider API. Every data source, broker, news feed, and notification channel must sit behind abstract interfaces.

---

## 2. Target Asset Classes & Market Coverage

| Market | Target Exchanges | Coverage Scope | Primary Provider | Zero-Cost / Low-Friction Alternative |
| :--- | :--- | :--- | :--- | :--- |
| **Indian Equities** | NSE & BSE | Top 500 Nifty/Sensex constituents, Intraday + EOD | DhanHQ API | Angel One SmartAPI / Zerodha Kite Connect / Yahoo Finance (delayed) |
| **Indian Commodities** | MCX | Crude Oil, Gold, Silver, Natural Gas futures | DhanHQ | Yahoo Finance / Investing.com scrapers |
| **US Equities & ETFs** | NYSE, NASDAQ, IEX | S&P 500, Nasdaq 100, Major ETFs (SPY, QQQ, VXX) | Alpaca Market Data (Basic/IEX) | Finnhub / Polygon.io / Alpha Vantage / Yahoo Finance |
| **Cryptocurrency** | Global 24/7 | Top 50 pairs by volume (BTC, ETH, SOL, etc.) | Binance Public API / WebSockets | Coinbase Public API / CoinGecko API / Bybit |
| **Forex & Global Macro** (Phase 2 Extension) | Interbank / OANDA | Major pairs (EURUSD, USDJPY, GBPUSD), DXY, US 10Y Yield | Finnhub / TwelveData | Yahoo Finance macro tickers |

---

## 3. Technology Stack & System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite + TS)                         │
│  - Lightweight Charts (TradingView)  - Real-time SignalR/WebSocket Stream       │
│  - Tailwind CSS Dark Cockpit         - TanStack Query (State & Caching)         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ REST / WebSockets / SignalR
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        BACKEND API (ASP.NET Core Web API)                       │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐  │
│  │ Market Regime Engine  │ │ Deterministic Signals │ │ Risk & Sizing Engine  │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────┘  │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐  │
│  │ Backtesting Engine    │ │ Paper Trading Engine  │ │ Alert Notification    │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────────┘  │
└───────────────────┬─────────────────────────────────┬───────────────────────────┘
                    │                                 │
┌───────────────────▼──────────────┐   ┌──────────────▼───────────────────────────┐
│        DATA & STORAGE LAYER      │   │          EXTERNAL PROVIDERS (ADAPTERS)   │
│  - PostgreSQL / SQLite (Relational)│   │  - IMarketDataProvider (Dhan, Alpaca,...)│
│  - Redis / In-Memory Cache       │   │  - INewsProvider (Pluggable feeds)       │
│  - Time-series candle storage    │   │  - INotificationProvider (Telegram, Discord)│
│  - Migration & Audit logs        │   │  - ILLMProvider (Claude, OpenAI, Local)  │
└──────────────────────────────────┘   └──────────────────────────────────────────┘
```

### 3.1 Recommended Production Stack
* **Backend:** ASP.NET Core Web API (.NET 8 or .NET 10).
  * *Strengths:* High throughput, native multi-threaded background workers (`IHostedService` / `BackgroundService`), strong type safety, built-in SignalR WebSockets, excellent memory efficiency for high-frequency candle ingestion.
* **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS.
  * Charting: TradingView Lightweight Charts (performance-optimized canvas charts).
  * State & Data Fetching: TanStack Query v5 + Zustand.
  * UI Components: Lucide React icons, Tailwind CSS dark cockpit aesthetic.
* **Storage & Caching:**
  * Primary Database: PostgreSQL with TimescaleDB extension (or native partitioning for tick/candle time-series) via Entity Framework Core & Dapper for fast reads.
  * Cache & Ephemeral State: Redis (storing hot orderbooks, latest quotes, rate-limit counters, distributed deduplication locks).
* **Local Development / Zero-Install Fallback:**
  * If Docker is not available locally, the architecture must support running on **SQLite + MemoryCache** with a single configuration flag (`DatabaseProvider: "Sqlite"`).

---

## 4. Comprehensive Feature Catalog

### 4.1 Dashboard (The Master Trading Cockpit)
* **Global Market Ticker Tape:** Rolling real-time quotes across NIFTY 50, S&P 500, BTC/USD, Gold, and Crude Oil.
* **Market Regime Indicator:** Real-time visual badge of current global & asset-specific regimes (`TRENDING_BULLISH`, `TRENDING_BEARISH`, `CHOPPY_SIDEWAYS`, `HIGH_VOLATILITY`, `LIQUIDITY_COMPRESSION`).
* **Active Watchlist Grid:** Real-time mini sparkline charts, % change, volume relative to 20-day average (RVOL), current ATR, and current active signal status.
* **Signal Broadcast Bar:** Top active Strong BUY / Strong SELL opportunities filtered by statistical confidence score (> 75%).
* **Unusual Volume & Volatility Screener:** Real-time alerts for symbols experiencing > 3x standard deviation volume spike or volatility breakouts.
* **Live System Telemetry Badge:** Health status of every connected provider, latency metrics, WebSocket connection states, and last-received tick timestamp.

### 4.2 Screener & Watchlist Management
* **Multi-Market Screening:** Filter instruments simultaneously across NSE, US stocks, and Crypto.
* **Dynamic Scanners:**
  * *Volume Breakout Scanner:* Volume > 2.5x 20-period SMA + Price breaking 20-day high.
  * *Volatility Squeeze Scanner:* Bollinger Bands contracting inside Keltner Channels (impending breakout detection).
  * *RSI Divergence Scanner:* Regular and hidden bullish/bearish divergences on 15m/1h/1D charts.
  * *Moving Average Golden/Death Crosses:* 50 EMA crossing 200 EMA with volume confirmation.
* **Custom Watchlist Folders:** Grouping by sector, market, or strategy (e.g., "Nifty Momentum", "US Tech AI", "Crypto High Beta").
* **Custom Columns:** User-selectable metrics (RVOL, Beta, ATR %, Distance from 52-week High/Low).

### 4.3 Interactive Charting & Multi-Timeframe Analysis
* **Engine:** TradingView Lightweight Charts integration with full candlestick, bar, and area modes.
* **Supported Timeframes:** 1m, 5m, 15m, 1h, 4h, 1D, 1W.
* **Multi-Timeframe Sync:** Ability to view 3 synchronized charts for a single asset (e.g., 1D for Macro Trend, 1h for Setup, 15m for Entry Trigger).
* **Indicator Overlays & Subplots:**
  * Overlays: SMA, EMA (20, 50, 200), VWAP with standard deviation bands, Bollinger Bands, Supertrend, Parabolic SAR, Keltner Channels.
  * Oscillators / Sub-panels: RSI (14) with smoothed MA, MACD (12, 26, 9), ATR (14), Volume with 20-SMA, On-Balance Volume (OBV), Stochastic Oscillator.
  * Dynamic Price Levels: Automatic Support & Resistance lines, Previous Day High/Low (PDH/PDL), Fibonacci retracement levels.
* **Signal Marker Annotations:** Interactive icons directly plotted on the chart displaying historical entries, exits, stop losses, and take profit hits.

### 4.4 Technical Analysis & Indicator Calculation Engine
* **Pure Math Implementation:** Standalone, dependency-free C# indicator engine covered by comprehensive mathematical unit tests against known baseline values.
* **Indicators Catalog:**
  1. *Trend:* SMA, EMA, WMA, Double EMA, Supertrend, ADX (Average Directional Index).
  2. *Momentum:* RSI, MACD, Stochastic RSI, Williams %R, Rate of Change (ROC).
  3. *Volatility:* Average True Range (ATR), Bollinger Bands, Chaikin Volatility, Historical Volatility.
  4. *Volume:* Volume SMA, RVOL (Relative Volume), VWAP (Session & Rolling), Volume Profile (Point of Control / Value Area High & Low), Accumulation/Distribution.
  5. *Structural / Price Action:* Swing Highs/Lows detection, Support/Resistance zones clustering, Fair Value Gaps (FVG), Liquidity Sweeps.

### 4.5 Market Regime Detection Engine
* **Purpose:** Prevents trend-following strategies from running in choppy sideways markets, and prevents mean-reversion strategies from getting destroyed during strong parabolic trends.
* **Regime Classifications:**
  * `TRENDING_UP`: Price > 50 EMA > 200 EMA + ADX > 25.
  * `TRENDING_DOWN`: Price < 50 EMA < 200 EMA + ADX > 25.
  * `SIDEWAYS_CONSOLIDATION`: ADX < 20 + Bollinger Band Width in bottom 20th percentile.
  * `HIGH_VOLATILITY_EXPANSION`: ATR > 2x 30-day average ATR + widened Bollinger Bands.
  * `LOW_VOLATILITY_COMPRESSION`: Squeeze condition (Bollinger Bands inside Keltner Channel).
* **Dynamic Rule Adjustment:** The signal engine adjusts required threshold scores based on the current regime (e.g., requires higher momentum threshold for long positions in a `SIDEWAYS` regime).

### 4.6 Deterministic Signal Generation Engine
* **Signal Output Structure:**
  * `Symbol`: e.g., `RELIANCE`, `NVDA`, `BTCUSDT`
  * `Market`: `NSE` | `US` | `CRYPTO`
  * `Direction`: `BUY` | `SELL` | `HOLD` / `NEUTRAL`
  * `CompositeScore`: Normalized score from 0 to 100
  * `Timeframe`: 15m, 1h, 1D
  * `EntryPriceRange`: [MinEntry, MaxEntry]
  * `StopLoss`: Suggested strict invalidation price level
  * `TakeProfitTargets`: Multiple staged targets (T1: 1.5R, T2: 2.5R, T3: Trail ATR)
  * `RiskRewardRatio`: Calculated dynamically (e.g., 1:2.4)
  * `ReasonsList`: Transparent list of conditions met (e.g., "1. 50 EMA crossed above 200 EMA on 1h; 2. RVOL = 3.2x; 3. RSI pulled back to 52 in Bullish Regime")
  * `StrategyVersion`: Semantic version tag (e.g., `TrendBreakout_v1.2.0`)
  * `ExpiryTimestamp`: Time after which the setup is void if not triggered
* **Scoring Methodology (Configurable Weights):**
  * Technical Trend Alignment: 20%
  * Momentum & Oscillator Confirmation: 15%
  * Volume & Institutional Footprint (RVOL / VWAP): 15%
  * Key Support / Resistance / Retracement Level: 15%
  * Volatility Expansion Confirmation: 10%
  * Market Regime Alignment: 10%
  * Fundamentals (PE, Earnings Growth - where available): 10%
  * News Sentiment Score: 5%

### 4.7 Risk Management & Position Sizing Engine
* **Fixed Fractional Risk Sizing:** Calculates exact quantity of shares/contracts so maximum loss never exceeds user-defined account risk (e.g., exactly 1.0% of total capital on stop-loss hit).
  $$\text{Position Size} = \frac{\text{Account Capital} \times \text{Risk \%}}{|\text{Entry Price} - \text{Stop Loss Price}|}$$
* **Dynamic Stop-Loss Models:**
  * ATR-based Trailing Stops (e.g., $2.0 \times \text{ATR}_{14}$).
  * Structural Swing Low / Swing High Stops.
  * Breakeven Stop Adjustment once Target 1 (1.5R) is hit.
* **Portfolio Risk Guardrails:**
  * Maximum Concurrent Open Positions (e.g., max 5 positions).
  * Maximum Sector Exposure (e.g., max 30% in Technology).
  * Maximum Daily Portfolio Loss Limit (Circuit breaker: halts new signals if daily paper loss exceeds 3%).
  * Correlated Asset Warning (Alerts if taking 3 simultaneous long trades in highly correlated instruments like BTC + ETH + SOL).

### 4.8 Backtesting Engine & Performance Analytics
* **Features:**
  * Event-driven, bar-by-bar historical candle replay to eliminate look-ahead bias.
  * Realistic transaction costs: configurable slippage (e.g., 0.05%) and exchange brokerage/commissions (e.g., STT, SEBI fees, exchange fees for India; zero-commission with ECN fees for US).
  * Walk-Forward Optimization: in-sample parameter calibration and out-of-sample forward testing.
  * Multi-timeframe execution simulation (signals on 1h, fills simulated on 1m bars to accurately model stop-loss and take-profit hit sequence).
* **Comprehensive Metrics Output:**
  * Total Net Return & Compounded Annual Growth Rate (CAGR).
  * Win Rate (%) & Total Trade Count.
  * Profit Factor ($\frac{\text{Gross Profit}}{\text{Gross Loss}}$).
  * Expectancy ($\text{Win Rate} \times \text{Avg Win} - \text{Loss Rate} \times \text{Avg Loss}$).
  * Maximum Drawdown (MDD) % & Peak-to-Valley Duration.
  * Sharpe Ratio & Sortino Ratio (downside risk adjusted).
  * Consecutive Wins vs. Consecutive Losses.
  * Average Holding Time (Winners vs. Losers).
  * Equity Curve chart and Monthly Performance Heatmap.

### 4.9 Paper Trading & Virtual Execution Simulator
* **Features:**
  * Complete virtual broker simulation with realistic order types: Market, Limit, Stop-Loss, Stop-Limit, Trailing Stop.
  * Virtual balance tracking (INR and USD accounts).
  * Real-time order matching engine listening to live WebSocket ticker stream.
  * Slippage simulation on fill.
  * Live Open Positions table: current price, unrealized P&L (₹ / $ and %), target distance, stop distance, trailing status.
  * Closed Trades Journal: full lifecycle audit trail from signal trigger $\to$ order placed $\to$ fill $\to$ exit with realized P&L and reason for closure (Hit Target, Hit SL, Manual Close, Expiry).
  * One-Click Manual Actions: Close Position, Move Stop to Breakeven, Partially Close (50%).

### 4.10 Pluggable Notification & Alerting Hub
* **Supported Channels:**
  * **Telegram Bot API:** Rich markdown alerts with formatted emojis, entry/SL/TP levels, reasoning breakdown, and direct deep-link to the dashboard chart.
  * **Discord Webhooks:** Rich Discord embeds with colored borders (Green for BUY, Red for SELL), chart snapshots, and interactive buttons.
  * **Browser Push Notifications & In-App Audio:** Audio cues for critical events (breakouts, target hit, stop hit).
* **Smart Alert Management:**
  * *Alert Deduplication:* Cooldown timers preventing duplicate alerts for the same symbol within $N$ minutes.
  * *Quiet Hours Schedule:* Suppress non-critical notifications during sleep hours (with override for critical stop-loss triggers).
  * *Configurable Alert Filters:* Set minimum score thresholds (e.g., only notify on Telegram for signals with score $\ge 80$).

### 4.11 Pluggable News & Market Sentiment Engine
* **News Aggregation:** Pluggable connectors for Financial News (NewsAPI, RSS Feeds, Yahoo Finance News, Alpaca News).
* **Deduplication & Clustering:** Content hashing to prevent multiple identical news articles from cluttering the feed.
* **Symbol Entity Extraction:** Automatic extraction of stock tickers mentioned in headline and body.
* **Sentiment Scoring:** Rule-based keyword/VADER or LLM-driven sentiment scoring (-1.0 to +1.0) with confidence levels.
* **Decoupled Architecture:** Raw news articles stored immutably; sentiment calculations and summaries stored in separate relational tables.

### 4.12 AI / LLM Explanation & Copilot Layer
* **Role Clarification:** LLMs are strictly advisory and explanatory; they never compute indicators or place orders.
* **Capabilities:**
  1. *Signal Explainer:* Generates a 2-paragraph human-readable executive briefing explaining *why* a technical signal formed in plain English.
  2. *Market Regime Debrief:* Daily morning debrief summarizing pre-market index futures, major global overnight events, and overall market stance.
  3. *Post-Mortem Trade Analysis:* Analyzes closed paper trades to evaluate whether the trader exited prematurely or if stop placement was too tight relative to ATR.
  4. *Natural Language Querying:* Allows the user to ask in the UI: *"Show me all NSE stocks where 20 EMA is above 50 EMA and RSI was under 30 in the last 3 days."*

### 4.13 System Health, Resilience & 24/7 Operations
* **Heartbeat & Liveness Checks:** Continuous health check endpoints (`/health/live`, `/health/ready`) monitoring database connectivity, Redis connection, and external API quotas.
* **Provider Resiliency:**
  * Auto-reconnecting WebSockets with exponential backoff and jitter.
  * Circuit breaker pattern for external REST APIs (temporarily halt calls if provider returns 5xx or rate limit 429).
* **Stale Data Detector:** Background worker scanning latest received tick timestamps. If an instrument receives no ticks for $> 60$ seconds during market hours, it is marked `DATA_STALE`, charts display a yellow warning banner, and signal generation is suspended.
* **Market Session Calendar:** Precise timezone-aware market session tracker (knows Pre-Market, Regular Market, Post-Market, Closed, and Market Holidays for NSE/BSE and US exchanges).

---

## 5. UI Page & Navigation Hierarchy

The application interface is structured as a high-density, professional dark-mode trading station:

1. **`/` — Executive Dashboard:** High-level cockpit, regime gauges, market tickers, top signals, unusual volume.
2. **`/markets` — Market Overview:** Comprehensive exchange breakdown (NSE, BSE, US Equities, Crypto) with market breadth indicators (Advance/Decline ratio, New Highs/Lows).
3. **`/watchlist` — Watchlists & Scanners:** Customizable tables, sparkline mini-charts, real-time filters, sector groupings.
4. **`/signals` — Live & Historical Signals:** Active signals feed, confidence scores, rationale breakdowns, expired/triggered status.
5. **`/instrument/:symbol` — Instrument Deep Dive:** Comprehensive single-stock page: live chart, full technical metrics, fundamental ratios, active signals, related news.
6. **`/charts` — Multi-Chart Studio:** 1x1, 1x2, or 2x2 multi-symbol/multi-timeframe charting workstation.
7. **`/backtest` — Backtesting Lab:** Parameter configurator, strategy selector, historical date range picker, execution log, performance metrics report, equity curve.
8. **`/papertrading` — Virtual Trading Terminal:** Active virtual portfolio, open positions, order entry ticket, execution log, realized P&L curve.
9. **`/portfolio` — Performance Analytics:** Comprehensive analytics across paper trading history, win/loss distributions, drawdown charts.
10. **`/news` — News & Sentiment Feed:** Live ticker-tagged financial news streams, sentiment badges, AI article summaries.
11. **`/alerts` — Notification Center:** Audit log of all sent alerts, Telegram/Discord delivery status, custom rule builder.
12. **`/health` — System Telemetry:** Provider connection states, latency graphs, API rate limit usage, error logs.
13. **`/settings` — Configuration Hub:** API key management (stored server-side), risk tolerance defaults, alert quiet hours, strategy weight tuning.

---

## 6. Provider Interface Specifications (C# Contracts)

To ensure zero vendor lock-in, all external interactions are decoupled behind interfaces:

```csharp
// 1. Real-Time & Historical Market Data Contract
public interface IMarketDataProvider
{
    string ProviderName { get; }
    SupportedMarket SupportedMarkets { get; }
    Task<Quote> GetLatestQuoteAsync(string symbol, CancellationToken ct = default);
    Task<IReadOnlyList<Candle>> GetHistoricalCandlesAsync(string symbol, Timeframe timeframe, DateTime from, DateTime to, CancellationToken ct = default);
    Task SubscribeQuotesAsync(IEnumerable<string> symbols, Func<Quote, Task> onQuoteReceived, CancellationToken ct = default);
    Task UnsubscribeQuotesAsync(IEnumerable<string> symbols, CancellationToken ct = default);
    Task<ProviderHealthStatus> GetHealthStatusAsync(CancellationToken ct = default);
}

// 2. Pluggable News Contract
public interface INewsProvider
{
    string ProviderName { get; }
    Task<IReadOnlyList<NewsArticle>> GetLatestNewsAsync(IEnumerable<string>? symbols = null, int limit = 50, CancellationToken ct = default);
}

// 3. Pluggable Notifications Contract
public interface INotificationProvider
{
    string ChannelName { get; } // "Telegram", "Discord", "Push"
    Task<bool> SendAlertAsync(SignalAlertNotification alert, CancellationToken ct = default);
    Task<bool> SendSystemAlertAsync(string title, string message, AlertSeverity severity, CancellationToken ct = default);
}

// 4. Pluggable AI / LLM Explanation Contract
public interface ILLMExplanationProvider
{
    string ModelName { get; }
    Task<string> ExplainSignalAsync(Signal signal, MarketContext context, CancellationToken ct = default);
    Task<string> SummarizeNewsSentimentAsync(IReadOnlyList<NewsArticle> articles, string symbol, CancellationToken ct = default);
    Task<string> AnswerCopilotQueryAsync(string query, string contextData, CancellationToken ct = default);
}

// 5. Pluggable Virtual / Paper Broker Execution Contract
public interface IPaperBroker
{
    Task<PaperOrderResult> SubmitOrderAsync(PaperOrderRequest request, CancellationToken ct = default);
    Task<bool> CancelOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<PaperPortfolioSnapshot> GetPortfolioSnapshotAsync(CancellationToken ct = default);
    Task<IReadOnlyList<PaperPosition>> GetOpenPositionsAsync(CancellationToken ct = default);
}
```

---

## 7. Relational Database Schema Design (PostgreSQL / SQLite)

The schema is normalized, indexed for high-speed time-series queries, and auditable:

```sql
-- 1. Instruments Master
CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(32) NOT NULL,
    exchange VARCHAR(16) NOT NULL, -- 'NSE', 'BSE', 'NASDAQ', 'BINANCE'
    asset_class VARCHAR(16) NOT NULL, -- 'EQUITY', 'COMMODITY', 'CRYPTO'
    display_name VARCHAR(128) NOT NULL,
    tick_size NUMERIC(12, 4) NOT NULL DEFAULT 0.05,
    lot_size INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_instrument_symbol_exchange UNIQUE(symbol, exchange)
);

-- 2. Candles (Time-Series)
CREATE TABLE candles (
    id BIGSERIAL PRIMARY KEY,
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    timeframe VARCHAR(8) NOT NULL, -- '1m', '5m', '15m', '1h', '1D'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(16, 4) NOT NULL,
    high NUMERIC(16, 4) NOT NULL,
    low NUMERIC(16, 4) NOT NULL,
    close NUMERIC(16, 4) NOT NULL,
    volume NUMERIC(20, 4) NOT NULL,
    vwap NUMERIC(16, 4),
    CONSTRAINT uq_candle_instrument_timeframe_timestamp UNIQUE(instrument_id, timeframe, timestamp)
);
CREATE INDEX idx_candles_lookup ON candles(instrument_id, timeframe, timestamp DESC);

-- 3. Market Regimes
CREATE TABLE market_regimes (
    id BIGSERIAL PRIMARY KEY,
    instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE,
    market VARCHAR(16) NOT NULL, -- Global or specific symbol
    regime_type VARCHAR(32) NOT NULL, -- 'TRENDING_UP', 'SIDEWAYS', etc.
    adx_value NUMERIC(8, 2),
    volatility_metric NUMERIC(8, 2),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Signals
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES instruments(id),
    timeframe VARCHAR(8) NOT NULL,
    direction VARCHAR(8) NOT NULL, -- 'BUY', 'SELL', 'HOLD'
    composite_score NUMERIC(5, 2) NOT NULL,
    confidence_probability NUMERIC(5, 2),
    entry_low NUMERIC(16, 4) NOT NULL,
    entry_high NUMERIC(16, 4) NOT NULL,
    stop_loss NUMERIC(16, 4) NOT NULL,
    target_1 NUMERIC(16, 4) NOT NULL,
    target_2 NUMERIC(16, 4),
    risk_reward_ratio NUMERIC(6, 2) NOT NULL,
    strategy_version VARCHAR(32) NOT NULL,
    reasons_json JSONB NOT NULL, -- Array of rule justifications
    ai_explanation TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'TRIGGERED', 'EXPIRED', 'INVALIDATED'
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_signals_instrument ON signals(instrument_id, generated_at DESC);

-- 5. Backtest Runs & Trades
CREATE TABLE backtest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_name VARCHAR(64) NOT NULL,
    parameters_json JSONB NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_trades INT NOT NULL,
    win_rate NUMERIC(5, 2) NOT NULL,
    profit_factor NUMERIC(8, 2) NOT NULL,
    sharpe_ratio NUMERIC(6, 2),
    max_drawdown_pct NUMERIC(5, 2) NOT NULL,
    net_return_pct NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Paper Trading Portfolios, Orders & Positions
CREATE TABLE paper_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    starting_balance NUMERIC(16, 2) NOT NULL,
    current_cash NUMERIC(16, 2) NOT NULL,
    realized_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE paper_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES paper_portfolios(id),
    instrument_id UUID NOT NULL REFERENCES instruments(id),
    signal_id UUID REFERENCES signals(id),
    side VARCHAR(8) NOT NULL, -- 'LONG', 'SHORT'
    quantity INT NOT NULL,
    average_entry_price NUMERIC(16, 4) NOT NULL,
    current_stop_loss NUMERIC(16, 4) NOT NULL,
    current_take_profit NUMERIC(16, 4) NOT NULL,
    unrealized_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.0,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES paper_positions(id),
    order_type VARCHAR(16) NOT NULL, -- 'ENTRY', 'STOP_LOSS', 'TAKE_PROFIT', 'MANUAL_CLOSE'
    price NUMERIC(16, 4) NOT NULL,
    quantity INT NOT NULL,
    slippage NUMERIC(12, 4) NOT NULL DEFAULT 0.0,
    commission NUMERIC(12, 4) NOT NULL DEFAULT 0.0,
    realized_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.0,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Notifications Log & Deduplication
CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    signal_id UUID REFERENCES signals(id),
    channel VARCHAR(16) NOT NULL, -- 'TELEGRAM', 'DISCORD'
    recipient VARCHAR(64) NOT NULL,
    message_payload TEXT NOT NULL,
    sent_successfully BOOLEAN NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_dedup ON notification_logs(signal_id, channel, sent_at DESC);
```

---

## 8. Provider Integration Matrix & Secrets Configuration

All sensitive keys are strictly managed via environment variables and never checked into source control:

```ini
# Core Runtime Environment
APP_ENV=Development
ASPNETCORE_ENVIRONMENT=Development
PORT=5000

# Database & Cache Configuration
# Local SQLite fallback: "Data Source=prostock.db"
DATABASE_URL=Host=localhost;Port=5432;Database=prostock;Username=postgres;Password=your_password
REDIS_URL=localhost:6379

# India Market Data: DhanHQ
DHAN_CLIENT_ID=your_dhan_client_id
DHAN_ACCESS_TOKEN=your_dhan_access_token

# US Market Data: Alpaca
ALPACA_API_KEY=your_alpaca_key
ALPACA_API_SECRET=your_alpaca_secret
ALPACA_USE_PAPER=true

# Crypto Market Data: Binance (Public APIs default; keys only if private stream needed)
BINANCE_API_KEY=
BINANCE_API_SECRET=

# Notification Channels
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_id/your_token

# Optional News & AI Providers
NEWS_API_KEY=your_news_api_key
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=
```

---

## 9. Feature Decision & Evaluation Matrix (For Claude Review)

> **Architectural Decisions Open for Claude's Assessment:**  
> The following list highlights key architectural forks, advanced candidate features, and operational questions. Claude is requested to review and recommend the optimal approach for each:

| Decision / Feature Candidate | Option A | Option B | Core Trade-off / Question for Claude |
| :--- | :--- | :--- | :--- |
| **1. Database Engine for Phase 1** | Full Docker PostgreSQL + TimescaleDB | Local SQLite + In-Memory Caching | Docker is not currently installed on the host machine. Is SQLite sufficient for storing 1m/15m candles during Phase 1-3, or should Docker Desktop / Supabase cloud PostgreSQL be mandated immediately? |
| **2. Indicator Calculation Engine** | Custom pure C# calculations | Standard NuGet wrapper (e.g., Skender.Stock.Indicators) | Should we write bespoke indicator classes or leverage established, battle-tested open-source libraries like `Skender.Stock.Indicators`? |
| **3. Granularity of Historical Storage** | Tick-by-tick storage | Aggregated OHLCV Candlesticks (1m, 5m, 1h, 1D) | Is saving tick data necessary for a swing/intraday research system, or does it add excessive disk bloat and I/O bottlenecks without commensurate value? |
| **4. Machine Learning Probability Scoring** | Pure deterministic mathematical scoring (0-100) | Calibrated ML classifier (e.g., LightGBM / XGBoost on historical indicator states) | Master prompt states "Never describe a score as probability unless statistically calibrated." Should Phase 1 stick strictly to rule scoring, and defer ML probability calibration to a dedicated Phase? |
| **5. Discord vs. Telegram as Primary Channel** | Telegram Bot API | Discord Webhook | Discord Webhooks require zero bot setup (1 URL, 0 auth tokens, rich embeds). Should Discord be elevated to primary notification channel alongside Telegram? |
| **6. Multi-Asset Portfolio Balancing** | Independent asset paper trading | Global portfolio equity allocation with correlation penalties | Should the paper trading engine treat Indian stocks and US stocks in separate independent sub-portfolios with native currencies (INR vs USD)? |
| **7. Real-Time Frontend Streaming Protocol** | ASP.NET Core SignalR | Raw WebSockets | SignalR provides automatic reconnection, fallback transports, and typed RPC hubs out of the box. Is SignalR the ideal choice over raw WebSockets? |

---

## 10. Phased Development Roadmap

1. **Phase 0 — Blueprint & Architecture Validation:** System specification, provider interface definitions, database schema approval, and environment setup checklist.
2. **Phase 1 — Project Foundation & Mock Engine:** ASP.NET Core backend scaffolding, clean architecture solution structure, React + Vite frontend cockpit, mock data provider streaming synthetic live candles, and end-to-end SignalR verification.
3. **Phase 2 — Technical Indicators & Mathematical Engine:** Core indicators implementation (EMA, RSI, MACD, VWAP, Bollinger, ATR) verified via unit tests against known baseline datasets.
4. **Phase 3 — Market Regime & Deterministic Signal Engine:** Implementation of regime classification state machine and multi-factor weighted scoring rules with explainable reason generation.
5. **Phase 4 — Real Market Data Integration:**
   * Binance public WebSockets (24/7 testbed for instant live testing without market hour restrictions).
   * DhanHQ integration for Indian equities and commodities.
   * Alpaca integration for US equities.
6. **Phase 5 — Backtesting Engine:** Bar-by-bar historical simulation, walk-forward testing, commission/slippage modeling, and performance metrics generation.
7. **Phase 6 — Paper Trading Terminal:** Virtual portfolio accounting, simulated order execution against live streams, and open position management.
8. **Phase 7 — Multi-Channel Notifications:** Telegram Bot and Discord Webhook integration with deduplication and quiet-hour filters.
9. **Phase 8 — News & AI Copilot Layer:** Pluggable news ingestion and LLM explanation layer for signal rationale and market condition summaries.
10. **Phase 9 — Production Polish, Resilience & Hardening:** Circuit breakers, stale data detectors, structured logging, health checks, and Docker containerization.

---

## 11. Definition of Done (Validation Checklist)

The platform is officially production-ready when:
- [ ] Backend builds cleanly with zero errors (`dotnet build`) and all indicator unit tests pass (`dotnet test`).
- [ ] Frontend builds cleanly (`npm run build`) and renders all 13 cockpit views in dark mode without runtime console errors.
- [ ] Live charts render and update in real-time via SignalR WebSocket streaming without UI lag or memory leaks.
- [ ] Every generated signal includes explicit mathematical reasons, stop loss, targets, and risk/reward ratio.
- [ ] Backtest engine executes across 1+ years of historical data and generates verified metrics (Sharpe, Max Drawdown, Win Rate).
- [ ] Paper trading engine accurately executes orders against live prices, tracks open P&L, and records closed trades to the audit journal.
- [ ] Telegram or Discord receives formatted notifications without duplicate alerts.
- [ ] When an external provider disconnects, the system flags the feed as stale, halts signal generation for affected symbols, and attempts automatic reconnection.
- [ ] Zero secrets or API keys exist in git history, client-side bundles, or frontend code.
