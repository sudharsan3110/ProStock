# ProStock — Master Product Specification & Build Instructions (v2.0)

> **Document purpose:** This is the single source of truth for building ProStock. It is written to be handed directly to a human developer or an AI coding agent. Every section is either a *requirement* (MUST / MUST NOT / SHOULD), a *decision* (already resolved, with rationale), or a *build instruction* (what to do, in what order, how to know it is done).
>
> **What changed from v1:** Section 0 lists the flaws found in v1 and how v2 fixes them. All open questions in v1 Section 9 are now resolved (Section 17). New features, a rebuilt schema, a full UI/UX specification, a testing strategy, security, deployment, and an AI-agent build playbook have been added.
>
> **Keyword convention:** MUST / MUST NOT / SHOULD / MAY are used in the RFC 2119 sense.

---

## 0. Review Findings — Flaws & Gaps Found in v1 (and the Fix)

| # | Severity | Finding in v1 | Fix in v2 |
|---|----------|---------------|-----------|
| 1 | **High** | `confidence_probability` column and the dashboard's "statistical confidence > 75%" contradict Principle 4 ("never call a score a probability unless calibrated"). | Score is renamed **Setup Score**. A `calibrated_hit_rate` is shown only after backtest-derived calibration exists (§8.4, §17-D4). |
| 2 | **High** | Regime names are inconsistent across the doc (`TRENDING_BULLISH`, `TRENDING_UP`, `SIDEWAYS`, `CHOPPY_SIDEWAYS`, `LIQUIDITY_COMPRESSION`…). | One canonical enum (§7.1). |
| 3 | **High** | Schema precision: `NUMERIC(16,4)` truncates low-priced crypto (e.g. SHIB) and `INT quantity` blocks fractional crypto. | `NUMERIC(28,10)` prices, `NUMERIC(28,10)` quantities (§12). |
| 4 | **High** | No handling of **corporate actions** (splits, bonuses, dividends). Indicators and backtests on unadjusted history are silently wrong. | Corporate-actions table + adjusted-price pipeline (§6.4, §12). |
| 5 | **High** | No **futures contract/expiry/rollover** model for MCX commodities. | `instruments` gains `instrument_type`, `expiry_date`, `underlying_id`, continuous-contract series (§6.5). |
| 6 | **High** | Backtest rules are vague on **intrabar ambiguity** (stop and target both inside one bar), **look-ahead via higher timeframes**, **survivorship bias**, **overfitting**. | Explicit simulation contract and anti-bias rules (§9). |
| 7 | **High** | No `paper_orders` table although order types (limit/stop/trailing) are specified; no portfolio-level multi-currency handling. | Full order lifecycle schema (§12). |
| 8 | **High** | News sentiment feeds the score (5%) but an LLM is "prohibited from signals" — ambiguous and non-deterministic. | News score MUST come from a **versioned deterministic scorer** (VADER/lexicon or a pinned model run offline, result cached & immutable). LLM may only *summarize* (§14). |
| 9 | **Medium** | Fundamentals weight (10%) is undefined for crypto/commodities; weights silently misbehave. | **Weight renormalization** across available factors, with factor-coverage disclosed per signal (§8.3). |
| 10 | **Medium** | Alpaca free/IEX feed volume is a small fraction of consolidated volume → RVOL and volume signals are distorted for US stocks. | Per-provider `volume_semantics` flag; volume-based rules auto-discount or are disabled on partial-volume feeds (§6.3). |
| 11 | **Medium** | Yahoo Finance / Investing.com scrapers listed as fallbacks — unofficial, ToS-risky, fragile. | Marked "research-only, never production source"; official providers preferred (§6.2). |
| 12 | **Medium** | Timezone / session handling is under-specified (DST, NSE special sessions like Muhurat, early closes, holidays, candle-boundary alignment). | Dedicated Market Calendar service + UTC-everywhere rule (§6.6). |
| 13 | **Medium** | No authentication/authorization despite a 24/7 internet-reachable service holding API keys. | Auth, secrets, network, and hardening spec (§16). |
| 14 | **Medium** | No observability beyond health endpoints. | Structured logging, metrics, tracing, alerting-on-self (§15). |
| 15 | **Medium** | Redis is mandated but not needed at single-user scale in early phases; adds ops burden. | Redis is **optional**; `Channel<T>` + `IMemoryCache` default (§4.3). |
| 16 | **Medium** | No data-quality layer (gaps, bad ticks, duplicate/out-of-order candles, backfill). | Data Quality Engine (§6.7). |
| 17 | **Medium** | No strategy registry / lifecycle (draft → shadow → active → retired) and no signal outcome tracking → no way to know whether live signals actually work. | Strategy Registry + Signal Outcome Tracker + Strategy Decay Monitor (§8.5, §8.6). |
| 18 | **Medium** | No event/economic calendar (earnings, RBI/FOMC, expiry days) → signals fire into known binary events. | Event Calendar with blackout rules (§6.8). |
| 19 | **Medium** | India-specific realities missing: MIS auto square-off, circuit limits, F&O ban list, T+1 settlement / no delivery short-selling, lot size changes. | Market-rules plug-ins per exchange (§10.4). |
| 20 | **Low** | UI spec is a page list only — no design system, states, accessibility, keyboard, replay, or journaling UX. | Full UI/UX specification (§13). |
| 21 | **Low** | `HOLD` listed as a "signal direction" (noise). | Replaced by `NEUTRAL` state kept internal; only BUY/SELL are broadcast (§8.1). |
| 22 | **Low** | Interface contracts lack clock abstraction, async streaming, cancellation of subscriptions, capabilities, and money type. | Revised contracts (§5). |
| 23 | **Low** | No backup / disaster-recovery, no deployment topology for "24/7". | Deployment & DR (§18). |
| 24 | **Low** | Definition of Done lacks performance budgets and determinism proof. | Expanded DoD with SLOs (§21). |

---

## 1. Executive Summary & Core Philosophy

### 1.1 Project Goal
ProStock is a **single-user, 24/7, autonomous market-analysis, signal-generation, backtesting and paper-trading platform** covering Indian equities & commodities, US equities/ETFs, and crypto (forex/macro in a later phase). It monitors markets continuously, classifies regimes, emits deterministic and fully-explained signals, validates strategies with realistic backtests, simulates execution, tracks whether its own signals actually work, and alerts the user.

### 1.2 Non-Negotiable Principles
1. **Deterministic rule engine.** Signals, scores, risk sizing and regime classification MUST be pure functions of (versioned strategy config + candle history + calendar + versioned news score). Same inputs ⇒ byte-identical outputs. A **determinism hash** is stored on each signal (§8.1).
2. **LLM is explainer only.** LLMs MUST NOT create, modify, score, size, or place anything. They only narrate, summarize, and translate natural-language queries into a **validated, whitelisted query DSL** (never raw SQL) (§14).
3. **Paper-trading first.** No broker credential with trade-execution permission may exist in config or code until the Live-Readiness Gate (§22) passes. Broker adapters in v1 MUST be read-only (market data) scopes.
4. **Stale-data safety.** Stale, gapped, or low-quality data MUST suspend signal generation and paper fills for the affected instrument and raise an alert.
5. **Pluggable everything.** Providers, brokers, news, notifications, LLMs, clocks, calendars are behind interfaces. Domain code MUST NOT reference a vendor SDK.
6. **Honest statistics.** Never present a number as probability, edge, or "confidence" unless it is calibrated and sample-size-qualified. Show sample sizes and confidence intervals wherever a rate is shown.
7. **Reproducibility.** Any signal, backtest, or paper trade MUST be re-creatable from stored inputs (data snapshot version + strategy version + config hash).
8. **Fail loud, degrade gracefully.** Partial provider failure degrades only the affected instruments/markets; the system keeps running and says so on screen.

---

## 2. Target Markets & Coverage

| Market | Exchanges | Scope (Phase 4 target) | Primary Provider | Fallback / Research-only |
|---|---|---|---|---|
| Indian Equities | NSE, BSE | Nifty 50/100/500 universe, intraday + EOD | DhanHQ (data scope) | Angel One SmartAPI, Zerodha Kite Connect (paid) |
| Indian Commodities | MCX | Crude, Gold, Silver, Natural Gas futures (with contract rollover) | DhanHQ | — |
| US Equities & ETFs | NYSE, NASDAQ | S&P 500, Nasdaq 100, major ETFs | Alpaca Market Data | Finnhub, Polygon, TwelveData |
| Crypto | Global 24/7 | Top 50 USDT pairs | Binance public REST/WS | Coinbase, Bybit, CoinGecko (EOD/slow) |
| Forex & Macro (Phase 2 extension) | Interbank | Majors, DXY, US10Y, India VIX | Finnhub / TwelveData | — |

**Rules**
- *Yahoo Finance / scrapers* are **research-only** (ad-hoc backfill for experiments). They MUST NOT be a production live feed (unofficial, ToS and reliability risk).
- *Provider limits* (subscription counts per connection, REST weights, daily quotas, token expiry) MUST be read from each provider's current docs at integration time and encoded in `ProviderCapabilities` (§5.1). Do not hard-code assumptions.
- **Universe management:** the active streaming universe is *tiered* — Tier 1 (watchlist + open positions + active signals) gets live tick/1m streaming; Tier 2 (rest of universe) gets polled 5m/15m/EOD bars. This keeps subscription counts and CPU bounded.
- India API access tokens are typically short-lived; the platform MUST implement a **token-refresh/renewal workflow** with expiry alerts (a human-assisted re-auth step is acceptable).

---

## 3. Scope, Phases & Non-Goals

**In scope (v1):** research, indicators, regimes, signals, backtesting, paper trading, alerts, news/sentiment, LLM explanations, journaling, health.

**Explicit non-goals (v1):** live order routing; options pricing/Greeks (options *data display* is Phase 2+); HFT/sub-second strategies; tick-level order-book reconstruction; multi-user/multi-tenant; mobile native apps (a PWA is in scope).

---

## 4. System Architecture

### 4.1 Logical Architecture

```
┌──────────────────────────────── FRONTEND (React 19 + Vite + TS, PWA) ────────────────────────────────┐
│ TradingView Lightweight Charts · TanStack Query · Zustand · SignalR client · Tailwind dark cockpit      │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                                │ REST (OpenAPI) + SignalR (MessagePack)
┌───────────────────────────────────────────────▼─────────────────────────────────────────────────────────┐
│                                   ASP.NET Core (.NET 10 LTS)                                              │
│  API Host (HTTP/SignalR)                         Worker Host(s) (BackgroundService)                        │
│  ┌─────────────┐ ┌──────────────┐               ┌─────────────────────────────────────────────────────┐  │
│  │ Query API   │ │ Command API  │               │ Ingestion → Normalize → DataQuality → CandleAggregator│  │
│  └─────────────┘ └──────────────┘               │ → Indicators → Regime → Signal → Risk → Alert/Paper   │  │
│                                                  └─────────────────────────────────────────────────────┘  │
└───────┬───────────────────────────┬──────────────────────────────┬────────────────────────────────────────┘
        │                           │                              │
┌───────▼─────────┐   ┌─────────────▼──────────┐    ┌─────────────▼─────────────────────────────┐
│ PostgreSQL (+   │   │ In-proc Channel<T> bus │    │ Provider Adapters (anti-corruption layer)  │
│ TimescaleDB)    │   │ + IMemoryCache         │    │ Market data · News · Notify · LLM · FX ·   │
│ (Redis optional)│   │ (Redis later if scaled)│    │ Calendar · CorporateActions                │
└─────────────────┘   └────────────────────────┘    └────────────────────────────────────────────┘
```

### 4.2 Solution Structure (Clean Architecture) — MUST follow

```
src/
  ProStock.Domain/            # Entities, value objects, enums, domain events. ZERO dependencies.
  ProStock.Indicators/        # Indicator abstractions + implementations. Depends on Domain only.
  ProStock.Strategies/        # IStrategy impls, scoring, regime classifier. Pure, deterministic.
  ProStock.Risk/              # Position sizing, guardrails, correlation. Pure.
  ProStock.Backtesting/       # Simulator, fill model, metrics, walk-forward.
  ProStock.Application/       # Use-cases, orchestration, ports (interfaces).
  ProStock.Infrastructure/    # EF Core, Dapper, repos, provider adapters, notifier adapters.
  ProStock.Api/               # HTTP, SignalR hubs, auth, OpenAPI.
  ProStock.Workers/           # Hosted services (ingestion, aggregation, signal loop, stale detector).
tests/
  ProStock.Indicators.Tests/  ProStock.Strategies.Tests/  ProStock.Backtesting.Tests/
  ProStock.Integration.Tests/ ProStock.Replay.Tests/ (golden-file determinism)
web/                          # React app
docs/                         # ADRs, runbooks, this spec
```

**Dependency rule:** `Domain ← Indicators/Strategies/Risk/Backtesting ← Application ← Infrastructure/Api/Workers`. Pure projects MUST NOT reference EF Core, HTTP, SignalR, or any vendor SDK. Enforce with an architecture test (e.g. NetArchTest).

### 4.3 Runtime Pipeline & Concurrency Model
- Single-process modular monolith. Workers communicate through bounded `System.Threading.Channels` with defined backpressure policy (drop-oldest for quotes, block for candles/signals).
- **Only closed candles trigger signal evaluation** (never evaluate on a forming candle except explicitly-labelled "intrabar alerts" which cannot create persisted signals).
- **Single writer per instrument/timeframe** (partitioned by instrument hash) → no races in candle aggregation.
- **Leader lock:** if two instances start, only one may run workers (DB advisory lock). Prevents duplicate signals/alerts.
- **Idempotency:** each signal has a natural key `(instrument_id, timeframe, strategy_version, bar_close_ts)`; unique index prevents duplicates after restarts/replays.
- **`IClock` abstraction** everywhere; `DateTime.UtcNow` is forbidden in domain code (analyzer rule). Required for backtest/replay determinism.
- **Redis is optional.** Introduce only if (a) multiple API instances, or (b) distributed rate-limit counters are needed. Default is in-memory.

### 4.4 Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Backend | **.NET 10 LTS**, ASP.NET Core, minimal APIs + controllers where useful | Nullable enabled, warnings-as-errors |
| Persistence | EF Core (writes, migrations) + Dapper (hot reads, bulk) | `Npgsql` bulk `COPY` for candle ingestion |
| DB | **PostgreSQL 16+ (TimescaleDB recommended)** | See §17-D1 |
| Realtime | **SignalR** with MessagePack protocol | See §17-D7 |
| Frontend | React 19, TS (strict), Vite, Tailwind, TanStack Query v5, Zustand, Lightweight Charts, Radix UI primitives, cmdk (command palette), uPlot/visx for analytics charts | |
| Observability | Serilog, OpenTelemetry (traces+metrics), Prometheus/Grafana or Seq (optional) | §15 |
| Testing | xUnit, FluentAssertions, FsCheck (property tests), Testcontainers, Playwright (E2E), Vitest | §20 |

---

## 5. Provider & Port Contracts (revised C#)

Design rules: all money/price types are `decimal` (never `double`) at domain boundary; all timestamps are `DateTimeOffset` in UTC; streaming uses `IAsyncEnumerable`/channels; every call accepts `CancellationToken`.

### 5.1 Market Data
```csharp
[Flags] public enum SupportedMarket { None=0, Nse=1, Bse=2, Mcx=4, Us=8, Crypto=16, Forex=32 }
public enum VolumeSemantics { Consolidated, VenueOnly /*e.g. IEX*/, Unknown }

public sealed record ProviderCapabilities(
    SupportedMarket Markets,
    IReadOnlySet<Timeframe> NativeTimeframes,
    int? MaxSubscriptionsPerConnection,
    int? MaxRestRequestsPerMinute,
    VolumeSemantics Volume,
    bool ProvidesAdjustedHistory,
    bool ProvidesCorporateActions,
    TimeSpan TypicalQuoteLatency);

public interface IMarketDataProvider
{
    string ProviderName { get; }
    ProviderCapabilities Capabilities { get; }
    Task<Quote> GetLatestQuoteAsync(InstrumentRef instrument, CancellationToken ct = default);
    Task<IReadOnlyList<Candle>> GetHistoricalCandlesAsync(InstrumentRef instrument, Timeframe tf,
        DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default);
    IAsyncEnumerable<MarketEvent> StreamAsync(IReadOnlyCollection<InstrumentRef> instruments,
        CancellationToken ct = default);                // Quote | Trade | Heartbeat | Disconnect | Reconnect
    Task UpdateSubscriptionsAsync(IReadOnlyCollection<InstrumentRef> add,
        IReadOnlyCollection<InstrumentRef> remove, CancellationToken ct = default);
    Task<ProviderHealthStatus> GetHealthStatusAsync(CancellationToken ct = default);
}
```

### 5.2 Other Ports (all MUST exist as interfaces in `Application`)
| Port | Responsibility |
|---|---|
| `IClock` | `UtcNow`, controllable in tests/backtests/replay |
| `IInstrumentMasterProvider` | Daily sync of symbols, lot sizes, tick sizes, expiries, ISINs |
| `ICorporateActionsProvider` | Splits, bonuses, dividends, symbol changes |
| `ICandleRepository` | Idempotent upsert, range reads, adjusted/unadjusted views |
| `INewsProvider` | Latest news, by symbol, since cursor |
| `ISentimentScorer` | **Deterministic**, versioned: `(article) → SentimentScore{value,confidence,scorerVersion}` |
| `IEconomicCalendarProvider` | Earnings, central-bank events, expiries, holidays |
| `IFxRateProvider` | INR/USD snapshots for unified reporting |
| `INotificationProvider` | `SendAlertAsync`, `SendSystemAlertAsync`, `SupportsActions` (buttons) |
| `ILLMExplanationProvider` | Explain, summarize, debrief, query→DSL (no trading authority) |
| `IPaperBroker` | Orders, fills, positions, portfolios (multi-currency) |
| `IStrategy` | `Evaluate(StrategyContext) → SignalCandidate?` — pure |
| `IRiskRule` | `Check(RiskContext) → RiskDecision` — pure, composable |
| `IMarketRulesProvider` | Exchange-specific constraints (§10.4) |

### 5.3 Provider Resiliency (MUST for every external adapter)
- Polly v8 pipeline: timeout → retry (exponential backoff + jitter) → circuit breaker → bulkhead.
- Honor `Retry-After` and rate-limit headers; central **token-bucket rate limiter per provider**.
- WebSocket: auto-reconnect with backoff+jitter, **resubscribe**, **gap detection on reconnect → trigger REST backfill** of the missing interval, emit `Disconnect/Reconnect` events visible in the UI.
- **Provider failover policy:** per-market ordered provider list; failover only for non-streaming data (history/EOD) automatically; streaming failover requires the secondary to meet `Capabilities` parity or the market is flagged `DEGRADED`.
- **Anti-corruption layer:** each adapter maps vendor DTOs → domain types and never leaks vendor enums.

---

## 6. Data Layer

### 6.1 Storage Granularity (decision D3 applied)
- Persist **OHLCV candles only**: `1m` (rolling retention), `5m`, `15m`, `1h`, `4h`, `1D`, `1W`.
- **Raw ticks are NOT persisted.** Keep a short in-memory ring buffer (e.g., last 5 minutes per Tier-1 symbol) for live display and debugging only.
- **Retention policy (configurable):** `1m` — 90 days (Tier-1) / 14 days (Tier-2); `5m/15m` — 3 years; `1h/4h/1D/1W` — indefinite. Use Timescale compression policies; older 1m data is downsampled, not deleted blindly.
- **Estimated volume sanity check:** 500 NSE symbols × 375 bars/day × ~250 days ≈ 47M 1m rows/year — fine for PostgreSQL/Timescale, painful for SQLite → another reason 1m retention is capped.

### 6.2 Candle Aggregation
- Higher timeframes are **derived** from lower ones by the platform (not trusted from provider) so that all providers behave identically; provider-native bars are used only for backfill and then reconciled.
- Aggregation boundaries MUST use exchange-local session boundaries (NSE 09:15–15:30 IST; US 09:30–16:00 ET w/ DST; crypto UTC). See §6.6.
- Every candle stores `source`, `is_final`, `adjusted_factor_version`, `volume_semantics`.

### 6.3 Volume Semantics
If the active provider is `VenueOnly` (e.g., IEX): RVOL-based and volume-dependent rules MUST be either (a) normalized against that same feed's own history only, and (b) labeled "partial volume" in UI and reasons list — or disabled via strategy config.

### 6.4 Corporate Actions & Adjusted Prices
- Store raw prices + corporate actions; compute **adjusted series** by backward-adjustment factors (versioned).
- Indicators and backtests MUST use the adjusted series; charts offer an **Adj / Raw toggle**.
- On a new corporate action: invalidate affected cached indicator state and re-materialize derived candles; log an audit entry. Signals active across an action date are auto-invalidated.

### 6.5 Derivatives & Commodities
- `instrument_type`: `EQUITY | ETF | INDEX | FUTURE | CRYPTO_SPOT | CRYPTO_PERP | FX | COMMODITY_FUT`.
- Futures carry `expiry_date`, `underlying_id`, `lot_size`, `tick_size`.
- **Continuous contract series** (front-month with roll rule: N days before expiry or volume-cross) for charting/backtesting, with back-adjust (ratio or difference — configurable) and roll-date markers on charts.
- Position sizing for futures uses lot size and margin approximation; paper portfolio tracks notional vs. margin.

### 6.6 Market Calendar & Time
- **All timestamps stored UTC.** Display in user-selectable timezone (default IST) with market-local tooltip.
- `IMarketCalendar` per exchange: sessions (pre/regular/post/closed), holidays, half-days, **special sessions** (e.g., NSE Muhurat), DST, and crypto 24/7.
- Calendar data is sourced from provider/official lists and cached; admin screen allows manual overrides with audit.
- Stale-data detection uses *calendar-aware* thresholds (no stale alarms outside trading hours).

### 6.7 Data Quality Engine (new)
Runs on every ingested bar and as a nightly audit:
- Gap detection (missing bars within session) → auto backfill job.
- Out-of-order / duplicate bar handling (upsert-by-key, later-final-wins).
- Sanity rules: `low ≤ open,close ≤ high`, non-negative volume, spike filter (|return| > k·ATR with zero volume flagged), zero-volume streaks.
- Cross-source reconciliation (when two providers exist): flag deviations over a threshold.
- Output: `data_quality_issues` table + per-instrument **Data Quality Score** shown on the Health page and as a chip on charts. Signals are suppressed when the score is below threshold.

### 6.8 Event & Economic Calendar (new)
- Earnings dates, RBI/Fed/ECB meetings, CPI/NFP, F&O expiry days, index rebalances, ex-dividend dates.
- **Blackout rules** (configurable per strategy): no new signals X hours before/after a flagged event for the affected instruments (or globally for macro events); signals created near events carry an `EVENT_RISK` flag in the UI.

---

## 7. Market Regime Engine

### 7.1 Canonical Regime Enum (use everywhere: code, DB, UI)
`TRENDING_UP` · `TRENDING_DOWN` · `RANGE_BOUND` · `HIGH_VOLATILITY` · `LOW_VOLATILITY_SQUEEZE` · `TRANSITION` (conflicting/unstable) · `UNKNOWN` (insufficient data)

### 7.2 Classification (deterministic state machine with hysteresis)
| Regime | Rule (defaults; all configurable & versioned) |
|---|---|
| TRENDING_UP | Close > EMA50 > EMA200 **and** ADX14 > 25 |
| TRENDING_DOWN | Close < EMA50 < EMA200 **and** ADX14 > 25 |
| RANGE_BOUND | ADX14 < 20 **and** BB-width percentile(250) < 20 |
| HIGH_VOLATILITY | ATR14 > 2× its 30-day mean **or** realized-vol percentile > 90 |
| LOW_VOLATILITY_SQUEEZE | Bollinger inside Keltner |
| TRANSITION | none of the above, or conditions flipping |

- **Hysteresis/min-dwell:** a regime change requires the condition to hold for *N* consecutive closed bars (default 3) → prevents flicker.
- Regime is computed **per instrument per timeframe** and also for **market-level proxies** (Nifty 50, S&P 500, BTC) plus **breadth** and **VIX/India VIX** context.
- Regime history stored with entry/exit timestamps (interval table, not point-in-time spam).

### 7.3 Regime → Strategy Policy
Each strategy declares `AllowedRegimes` and per-regime score adjustments. Trend strategies are blocked in `RANGE_BOUND`; mean-reversion strategies are blocked in `TRENDING_*` with ADX above a "parabolic" threshold. A **market-level regime veto** (e.g., US index in `HIGH_VOLATILITY` + down) can optionally halve position size or block new longs.

---

## 8. Deterministic Signal Engine

### 8.1 Signal Contract
```
Id, InstrumentId, Market, Timeframe, Direction (BUY|SELL),
SetupScore (0–100), ScoreBreakdown[], FactorCoverage (% of weight available),
EntryZone[min,max], StopLoss, Targets[T1,T2,T3/trail], RiskReward,
ReasonsList[ {ruleId, text, value, threshold, passed} ],
StrategyId, StrategyVersion, ConfigHash, DataSnapshotVersion, DeterminismHash,
Regime, EventRiskFlags[], DataQualityScore, VolumeSemantics,
GeneratedAt (bar-close ts), ExpiresAt, Status
Status: ACTIVE | TRIGGERED | EXPIRED | INVALIDATED | SUPPRESSED(reason)
```
- `DeterminismHash` = SHA-256 over canonical serialization of inputs + outputs. A **Replay Test** re-runs stored inputs and asserts equal hash.
- **SUPPRESSED** signals are persisted with the suppression reason (stale data, event blackout, risk guardrail, regime veto). This provides an audit trail and avoids "why didn't it fire?" confusion.
- `NEUTRAL/HOLD` is an internal evaluation outcome only and is never broadcast.

### 8.2 Entry/Exit Construction Rules
- **Entry zone** is derived from structure/ATR (e.g., breakout level to +0.25 ATR), never from the current tick.
- **Stop** = max(structural invalidation, k·ATR) with a min/max distance clamp; stop MUST be on the correct side of entry (validated).
- **Targets** in R-multiples (default 1.5R / 2.5R / ATR-trail); R:R below strategy minimum ⇒ suppress.
- **Liquidity filter:** require minimum average daily traded value; reject if position size would exceed X% of ADV.
- **Expiry:** setup voids after N bars or when invalidation level is breached before entry.

### 8.3 Scoring Methodology (configurable, versioned)
Default factor weights:

| Factor | Weight | Notes |
|---|---:|---|
| Trend alignment (multi-TF) | 20 | HTF agreement uses **only closed HTF bars** |
| Momentum/oscillator confirmation | 15 | |
| Volume / institutional footprint | 15 | Disabled/discounted on `VenueOnly` volume |
| Key level (S/R, retracement, PDH/PDL) | 15 | |
| Volatility expansion confirmation | 10 | |
| Regime alignment | 10 | |
| Fundamentals | 10 | Equities only; point-in-time data |
| News sentiment | 5 | Deterministic scorer output only |

- **Renormalization:** if a factor is unavailable (e.g., fundamentals for crypto), remove it and rescale remaining weights to 100; record `FactorCoverage`. A signal with coverage < threshold (default 80%) is suppressed.
- **Hard gates vs. soft score:** some conditions are *gates* (regime allowed, data fresh, no blackout, liquidity ok, R:R ok). Gates are binary and are never offset by high scores.
- **Score explainability:** UI shows a waterfall of contributions (§13.6).

### 8.4 Score Calibration (replaces "confidence")
- Phase 1–5: display **Setup Score** only, labelled "rule-based score, not a probability".
- After backtests/live shadow tracking accumulate ≥ N signals per score bucket (default N ≥ 100): show **Historical Outcome by Score Bucket** (win rate, avg R, expectancy) with Wilson confidence intervals and sample size. This is the *only* sanctioned "probability-like" display.
- ML probability models are deferred to Phase 11 (§19) and MUST pass calibration (reliability curve, Brier score) and walk-forward validation before ever being surfaced.

### 8.5 Strategy Registry & Lifecycle (new)
- Strategies are versioned (semver) with immutable configs. States: `DRAFT → BACKTESTED → SHADOW → ACTIVE → RETIRED`.
- **Shadow mode:** a strategy generates signals but they are only tracked (not alerted, not paper-traded) until it meets promotion criteria (min trades, expectancy > 0, max drawdown limit) — promotion is a manual user action.
- Starter strategies (examples to implement): `TrendBreakout`, `PullbackInTrend`, `VolatilitySqueezeBreakout`, `MeanReversionRSI2` (range only), `RSIDivergence`.

### 8.6 Signal Outcome Tracker & Strategy Decay Monitor (new)
- Every signal (including shadow/suppressed-by-risk) is followed forward bar-by-bar to a terminal outcome: `T1/T2/T3 hit`, `SL hit`, `EXPIRED`, with **MFE/MAE** (max favorable/adverse excursion) recorded.
- **Decay monitor:** rolling expectancy / win rate / profit factor per strategy vs. its backtest baseline; alert when live performance is statistically worse than baseline (e.g., rolling 30-trade expectancy below the lower CI bound). Auto-moves strategy to `SHADOW` if configured.

### 8.7 Scanners
Volume breakout, volatility squeeze, RSI divergence (regular/hidden), MA crosses, **new**: gap-up/gap-down with volume, relative strength vs. index, inside-day/NR7 compression, 52-week-high proximity, sector leaders. Scanners are *views over indicators* and do not create signals unless a strategy consumes them. Saved-scan presets and scan-result diffing ("new since last run") included.

---

## 9. Backtesting Engine (Simulation Contract)

### 9.1 Anti-Bias Rules (MUST)
1. **No look-ahead:** event-driven bar-by-bar replay; a bar's indicators use data ≤ that bar's close; orders from a bar execute no earlier than the **next bar open**.
2. **HTF alignment:** higher-timeframe values at time *t* come from the last **fully closed** HTF bar.
3. **Intrabar ambiguity rule:** if both stop and target lie within one bar's range, assume **stop hit first** (conservative) unless finer-grained (1m) data resolves order. Mode is configurable and reported.
4. **Gap fills:** stops are filled at the *worse* of stop and gap-open price; limit fills require price trade-through, not touch (configurable).
5. **Survivorship bias:** universe MUST be point-in-time where data allows (index constituents by date); otherwise the report carries a visible `SURVIVORSHIP_BIAS_RISK` badge.
6. **Corporate-action-adjusted** prices only (§6.4).
7. **Costs always on:** per-market cost models (§9.2); a zero-cost run requires explicit opt-in and is badged "UNREALISTIC".
8. **Capacity/liquidity:** fills capped at X% of bar volume; partial fills simulated.

### 9.2 Cost Models (pluggable `ICostModel`)
- **India equities (intraday/delivery):** brokerage, STT/CTT, exchange transaction charges, SEBI fees, stamp duty, GST, DP charges (delivery). Rates MUST be configuration with an effective-date table (they change); never hard-coded.
- **MCX futures:** brokerage + CTT + exchange fees + margin model.
- **US:** zero commission + regulatory fees (SEC/TAF) modelled; ECN fees configurable.
- **Crypto:** maker/taker fees by tier; funding rate for perps (Phase 2).
- **Slippage:** default fixed bps, with an optional **ADV/volatility-scaled model** (slippage grows with order size/ADV and ATR%).

### 9.3 Validation Methodology (anti-overfitting)
- **Walk-forward** (anchored and rolling) with configurable IS/OOS windows; report IS vs. OOS side by side.
- **Parameter sensitivity heatmaps** (a good strategy sits on a plateau, not a spike).
- **Monte Carlo:** trade-order shuffling and bootstrap resampling for drawdown/ruin distribution; **randomized entry baseline** ("does the strategy beat random entries with the same exits?").
- **Multiple-testing awareness:** log the number of parameter sets tried per strategy; show **Deflated Sharpe** or at minimum a "trials count" warning.
- **Minimum sample rule:** results with < 30 trades are badged `LOW_SAMPLE`.
- **Regime-sliced performance:** metrics broken down by regime, year, market, and direction.

### 9.4 Metrics
Net return, CAGR, win rate, avg win/loss, payoff ratio, profit factor, **expectancy (in R and currency)**, max drawdown (% and duration), **Ulcer Index**, Sharpe, Sortino, **Calmar**, exposure %, turnover, avg holding time (W/L), max consecutive W/L, MFE/MAE distributions, best/worst trade, monthly heatmap, rolling Sharpe, trade distribution histogram, cost drag (gross vs. net).

### 9.5 Reproducibility & Storage
Each run stores: strategy+version, config hash, data snapshot version, cost model version, seed (Monte Carlo), full trade list, equity curve (downsampled), and metrics. Runs can be **compared side-by-side** and **re-run** with one click to confirm identical results.

---

## 10. Risk, Position Sizing & Paper Trading

### 10.1 Sizing
Fixed-fractional: `qty = floor((equity × risk%) / |entry − stop| / lot_size) × lot_size`, rounded to instrument step size (fractional for crypto), subject to cash/margin and ADV caps. Optional **volatility-targeting** and a **hard cap on Kelly-style sizing** (never exceed fixed % cap).

### 10.2 Portfolio Guardrails (composable `IRiskRule`s)
Max concurrent positions · per-sector exposure · per-market exposure · **portfolio heat** (sum of open risk ≤ X% of equity) · daily/weekly loss circuit breakers · max consecutive-loss cooldown · **correlation cluster limit** (rolling correlation matrix → max N positions in one cluster, e.g. BTC/ETH/SOL) · single-position max notional % · no-trade windows (events, first/last N minutes of session).
Every rule returns `Allow | Reduce(factor) | Block(reason)`; decisions are persisted with the signal.

### 10.3 Paper Broker
- Order types: Market, Limit, Stop, Stop-Limit, Trailing Stop, **Bracket (entry + SL + TP) and OCO**.
- Full order lifecycle: `NEW → ACCEPTED → PARTIAL → FILLED | CANCELLED | REJECTED | EXPIRED`.
- **Fill model reuses the backtester's fill model** (single implementation → paper results are consistent with backtests).
- Fills occur only against fresh, quality-checked data; stale instrument ⇒ orders held, not filled.
- **Sub-portfolios by currency** (INR, USD, USDT) with an optional unified INR-equivalent view via `IFxRateProvider` snapshots (§17-D6).
- Corporate action handling for open positions (split-adjust qty/price).
- Manual actions: close, partial close, move stop to breakeven, trail toggle, scale-in/out, cancel all, **global "Flatten All" kill switch**.
- **Execution audit:** every state transition is an immutable event row (`paper_order_events`).

### 10.4 Exchange Rule Plug-ins (`IMarketRulesProvider`)
- **NSE/BSE:** intraday product square-off time, circuit-limit awareness (no fills beyond limits), tick size/lot size, F&O ban-list flag, delivery-segment short-sell restriction (shorts only via intraday/F&O), T+1 settlement for cash accounting, price bands.
- **US:** pattern-day-trader style constraints (optional simulation), halts, extended-hours handling, short-borrow availability flag.
- **Crypto:** step sizes, min notional, 24/7 (no session boundaries).
- **MCX:** contract lot sizes, session hours, expiry/rollover alerts.

---

## 11. Notifications, News & AI

### 11.1 Notification Hub
- **Telegram (primary, interactive):** formatted alerts + inline buttons (`Open chart`, `Mute symbol 24h`, `Open paper trade`) + two-way commands (`/status`, `/positions`, `/pnl`, `/mute`, `/flatten` guarded by confirmation).
- **Discord (secondary / ops channel):** webhook embeds (color-coded), used for system/health channel and as a redundant signal channel.
- **Web Push / PWA + in-app audio** for critical events.
- **Email** (optional) for daily digest.
- **Rules:** deduplication key `(signal_id, channel)` + per-symbol cooldown; quiet hours (critical bypass: stop hit, system down, circuit breaker); min-score filters per channel; **severity routing** (INFO→digest, WARN→Discord, CRITICAL→all); **delivery retry with dead-letter** and a visible failed-delivery list; **escalation** (re-notify via another channel if CRITICAL not acknowledged in N minutes); **daily digest** and **weekly performance report**.
- **Alert Rule Builder:** user-defined price/indicator/regime/volume alerts via a safe DSL (e.g., `RSI(14,1h) crosses_above 30 AND regime == TRENDING_UP`), validated against the same engine, never executed as arbitrary code.

### 11.2 News & Sentiment
- Connectors behind `INewsProvider`; immutable raw article store; content-hash + near-duplicate (simhash/shingle) clustering; entity/ticker extraction with alias table (company names → symbols) and ambiguity handling.
- `ISentimentScorer` **deterministic, versioned** (lexicon/VADER baseline; finance-tuned model optional but pinned and cached). Sentiment results are immutable per `(article_id, scorer_version)`.
- Source credibility weighting, recency decay, and a **news-spike detector** (article-count z-score per symbol).
- Sentiment feeds the score only through the 5% factor; raw LLM output never does.

### 11.3 LLM Copilot — Guardrails (MUST)
- **Capabilities:** signal explainer, daily regime debrief, post-mortem on closed trades, news summaries, NL-query → DSL.
- **Grounding:** prompts contain only structured facts from the DB (the signal's own `ReasonsList`, indicator values, calendar). The model is instructed to cite those fields.
- **Number-check:** post-process validator ensures any price/level/percentage in the LLM text exists in the provided context; mismatches are flagged or the output is discarded.
- **Prompt-injection defense:** news text is untrusted; wrap in delimiters, strip instructions, never allow tool/DB write access from the LLM path.
- **NL-query:** LLM emits a JSON query spec validated against a whitelist schema (fields, operators, limits); the server translates to parameterized queries. No raw SQL from a model, ever.
- **Cost & reliability:** per-day token budget, response caching keyed by `(signal_id, prompt_version)`, timeouts, graceful "explanation unavailable" fallback, and prompt versioning.
- Every AI text is badged "AI-generated explanation — not a signal source".

---

## 12. Database Schema v2 (PostgreSQL; SQLite-compatible subset noted)

> Conventions: `UUID` PKs (UUIDv7 preferred), UTC `timestamptz`, `NUMERIC(28,10)` for prices/quantities, `created_at/updated_at` on mutable tables, soft-delete where history matters. Candles table is a **Timescale hypertable** partitioned by `ts` (and space-partitioned by instrument if beneficial).

```sql
-- ===== Reference =====
CREATE TABLE instruments (
  id UUID PRIMARY KEY,
  symbol VARCHAR(48) NOT NULL,
  exchange VARCHAR(16) NOT NULL,                 -- NSE, BSE, MCX, NASDAQ, NYSE, BINANCE
  instrument_type VARCHAR(16) NOT NULL,          -- EQUITY, ETF, INDEX, FUTURE, CRYPTO_SPOT, ...
  asset_class VARCHAR(16) NOT NULL,
  isin VARCHAR(16),
  display_name VARCHAR(128) NOT NULL,
  sector VARCHAR(64), industry VARCHAR(64),
  currency VARCHAR(8) NOT NULL,
  timezone VARCHAR(48) NOT NULL,
  tick_size NUMERIC(28,10) NOT NULL,
  lot_size NUMERIC(28,10) NOT NULL DEFAULT 1,
  qty_step NUMERIC(28,10) NOT NULL DEFAULT 1,
  min_notional NUMERIC(28,10),
  underlying_id UUID REFERENCES instruments(id),
  expiry_date DATE,
  tier SMALLINT NOT NULL DEFAULT 2,              -- 1 = live stream, 2 = polled
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  listed_at DATE, delisted_at DATE,              -- survivorship handling
  provider_symbols JSONB NOT NULL DEFAULT '{}',  -- {"dhan":"1333","alpaca":"AAPL"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, exchange, expiry_date)
);

CREATE TABLE index_constituents (            -- point-in-time membership
  index_id UUID NOT NULL REFERENCES instruments(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  valid_from DATE NOT NULL, valid_to DATE,
  PRIMARY KEY(index_id, instrument_id, valid_from)
);

CREATE TABLE corporate_actions (
  id UUID PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  action_type VARCHAR(16) NOT NULL,            -- SPLIT, BONUS, DIVIDEND, MERGER, SYMBOL_CHANGE
  ex_date DATE NOT NULL,
  ratio_num NUMERIC(20,8), ratio_den NUMERIC(20,8), cash_amount NUMERIC(28,10),
  source VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instrument_id, action_type, ex_date)
);

CREATE TABLE market_holidays (
  exchange VARCHAR(16) NOT NULL, date DATE NOT NULL,
  kind VARCHAR(16) NOT NULL,                   -- HOLIDAY, HALF_DAY, SPECIAL_SESSION
  open_utc TIMESTAMPTZ, close_utc TIMESTAMPTZ, note TEXT,
  PRIMARY KEY(exchange, date)
);

CREATE TABLE economic_events (
  id UUID PRIMARY KEY, event_type VARCHAR(24) NOT NULL,   -- EARNINGS, CENTRAL_BANK, CPI, EXPIRY, ...
  instrument_id UUID REFERENCES instruments(id), region VARCHAR(16),
  title TEXT NOT NULL, importance SMALLINT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL, source VARCHAR(32) NOT NULL
);

-- ===== Market Data =====
CREATE TABLE candles (
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  timeframe VARCHAR(4) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,                      -- bar OPEN time, UTC
  open NUMERIC(28,10) NOT NULL, high NUMERIC(28,10) NOT NULL,
  low NUMERIC(28,10) NOT NULL, close NUMERIC(28,10) NOT NULL,
  volume NUMERIC(28,10) NOT NULL, vwap NUMERIC(28,10), trade_count INT,
  is_final BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(24) NOT NULL, volume_semantics VARCHAR(12) NOT NULL DEFAULT 'UNKNOWN',
  PRIMARY KEY (instrument_id, timeframe, ts),
  CHECK (low <= LEAST(open, close) AND high >= GREATEST(open, close) AND volume >= 0)
);
-- Timescale: SELECT create_hypertable('candles','ts'); + compression + retention policies.

CREATE TABLE data_quality_issues (
  id BIGSERIAL PRIMARY KEY, instrument_id UUID REFERENCES instruments(id),
  timeframe VARCHAR(4), issue_type VARCHAR(24) NOT NULL,   -- GAP, SPIKE, DUPLICATE, STALE, MISMATCH
  range_start TIMESTAMPTZ, range_end TIMESTAMPTZ, severity SMALLINT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'OPEN', detected_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);

CREATE TABLE provider_health_samples (
  id BIGSERIAL PRIMARY KEY, provider VARCHAR(24) NOT NULL, status VARCHAR(12) NOT NULL,
  latency_ms INT, last_event_at TIMESTAMPTZ, rate_limit_remaining INT,
  error_count_5m INT, sampled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Regimes =====
CREATE TABLE regime_intervals (
  id BIGSERIAL PRIMARY KEY, instrument_id UUID REFERENCES instruments(id),
  scope VARCHAR(16) NOT NULL,                  -- INSTRUMENT | MARKET
  market VARCHAR(16), timeframe VARCHAR(4) NOT NULL,
  regime VARCHAR(24) NOT NULL, adx NUMERIC(8,2), vol_percentile NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ, classifier_version VARCHAR(24) NOT NULL
);

-- ===== Strategies & Signals =====
CREATE TABLE strategies (
  id UUID PRIMARY KEY, name VARCHAR(64) NOT NULL, description TEXT
);
CREATE TABLE strategy_versions (
  id UUID PRIMARY KEY, strategy_id UUID NOT NULL REFERENCES strategies(id),
  version VARCHAR(16) NOT NULL, config_json JSONB NOT NULL, config_hash CHAR(64) NOT NULL,
  state VARCHAR(12) NOT NULL DEFAULT 'DRAFT',   -- DRAFT, BACKTESTED, SHADOW, ACTIVE, RETIRED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), promoted_at TIMESTAMPTZ,
  UNIQUE(strategy_id, version)
);

CREATE TABLE signals (
  id UUID PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(id),
  strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  timeframe VARCHAR(4) NOT NULL,
  direction VARCHAR(8) NOT NULL,                -- BUY, SELL
  setup_score NUMERIC(5,2) NOT NULL,
  factor_coverage NUMERIC(5,2) NOT NULL,
  score_breakdown JSONB NOT NULL,
  entry_low NUMERIC(28,10) NOT NULL, entry_high NUMERIC(28,10) NOT NULL,
  stop_loss NUMERIC(28,10) NOT NULL,
  target_1 NUMERIC(28,10) NOT NULL, target_2 NUMERIC(28,10), target_3 NUMERIC(28,10),
  risk_reward NUMERIC(8,2) NOT NULL,
  regime VARCHAR(24) NOT NULL,
  reasons_json JSONB NOT NULL,
  event_risk_flags JSONB NOT NULL DEFAULT '[]',
  data_quality_score NUMERIC(5,2),
  volume_semantics VARCHAR(12),
  data_snapshot_version VARCHAR(32) NOT NULL,
  determinism_hash CHAR(64) NOT NULL,
  bar_close_ts TIMESTAMPTZ NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  suppression_reason VARCHAR(48),
  mode VARCHAR(8) NOT NULL DEFAULT 'LIVE',      -- LIVE | SHADOW
  ai_explanation TEXT, ai_prompt_version VARCHAR(16),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(instrument_id, timeframe, strategy_version_id, bar_close_ts, direction)
);
CREATE INDEX idx_signals_recent ON signals(instrument_id, generated_at DESC);
CREATE INDEX idx_signals_status ON signals(status, generated_at DESC);

CREATE TABLE signal_outcomes (
  signal_id UUID PRIMARY KEY REFERENCES signals(id),
  outcome VARCHAR(16) NOT NULL,                 -- T1, T2, T3, SL, EXPIRED, OPEN
  r_multiple NUMERIC(8,3), mfe_r NUMERIC(8,3), mae_r NUMERIC(8,3),
  bars_to_outcome INT, resolved_at TIMESTAMPTZ
);

-- ===== Backtests =====
CREATE TABLE backtest_runs (
  id UUID PRIMARY KEY, strategy_version_id UUID NOT NULL REFERENCES strategy_versions(id),
  universe_json JSONB NOT NULL, parameters_json JSONB NOT NULL,
  cost_model_version VARCHAR(24) NOT NULL, fill_mode VARCHAR(16) NOT NULL,
  data_snapshot_version VARCHAR(32) NOT NULL, rng_seed BIGINT,
  start_date TIMESTAMPTZ NOT NULL, end_date TIMESTAMPTZ NOT NULL,
  metrics_json JSONB NOT NULL,                  -- full metrics (win rate, PF, Sharpe, MDD, ...)
  badges JSONB NOT NULL DEFAULT '[]',           -- LOW_SAMPLE, SURVIVORSHIP_BIAS_RISK, UNREALISTIC...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE backtest_trades (
  id BIGSERIAL PRIMARY KEY, run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id), side VARCHAR(8) NOT NULL,
  entry_ts TIMESTAMPTZ NOT NULL, exit_ts TIMESTAMPTZ NOT NULL,
  entry_price NUMERIC(28,10) NOT NULL, exit_price NUMERIC(28,10) NOT NULL, qty NUMERIC(28,10) NOT NULL,
  gross_pnl NUMERIC(28,10) NOT NULL, costs NUMERIC(28,10) NOT NULL, r_multiple NUMERIC(8,3),
  mfe_r NUMERIC(8,3), mae_r NUMERIC(8,3), exit_reason VARCHAR(16) NOT NULL, regime VARCHAR(24)
);
CREATE TABLE backtest_equity_points (
  run_id UUID NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL, equity NUMERIC(28,10) NOT NULL, drawdown_pct NUMERIC(8,4) NOT NULL,
  PRIMARY KEY(run_id, ts)
);

-- ===== Paper Trading =====
CREATE TABLE paper_portfolios (
  id UUID PRIMARY KEY, name VARCHAR(64) NOT NULL, currency VARCHAR(8) NOT NULL,
  starting_balance NUMERIC(28,10) NOT NULL, cash NUMERIC(28,10) NOT NULL,
  realized_pnl NUMERIC(28,10) NOT NULL DEFAULT 0, risk_config_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE paper_orders (
  id UUID PRIMARY KEY, portfolio_id UUID NOT NULL REFERENCES paper_portfolios(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id), signal_id UUID REFERENCES signals(id),
  parent_order_id UUID REFERENCES paper_orders(id), oco_group UUID,
  side VARCHAR(8) NOT NULL, order_type VARCHAR(16) NOT NULL, tif VARCHAR(8) NOT NULL DEFAULT 'DAY',
  qty NUMERIC(28,10) NOT NULL, limit_price NUMERIC(28,10), stop_price NUMERIC(28,10),
  trail_amount NUMERIC(28,10), status VARCHAR(12) NOT NULL, filled_qty NUMERIC(28,10) NOT NULL DEFAULT 0,
  avg_fill_price NUMERIC(28,10), reject_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE paper_order_events (          -- append-only audit
  id BIGSERIAL PRIMARY KEY, order_id UUID NOT NULL REFERENCES paper_orders(id),
  event_type VARCHAR(16) NOT NULL, payload JSONB NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE paper_fills (
  id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES paper_orders(id),
  price NUMERIC(28,10) NOT NULL, qty NUMERIC(28,10) NOT NULL,
  slippage NUMERIC(28,10) NOT NULL DEFAULT 0, commission NUMERIC(28,10) NOT NULL DEFAULT 0,
  filled_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE paper_positions (
  id UUID PRIMARY KEY, portfolio_id UUID NOT NULL REFERENCES paper_portfolios(id),
  instrument_id UUID NOT NULL REFERENCES instruments(id), signal_id UUID REFERENCES signals(id),
  side VARCHAR(8) NOT NULL, qty NUMERIC(28,10) NOT NULL, avg_entry NUMERIC(28,10) NOT NULL,
  stop_loss NUMERIC(28,10) NOT NULL, take_profit NUMERIC(28,10),
  initial_risk NUMERIC(28,10) NOT NULL,          -- for R-multiple accounting
  realized_pnl NUMERIC(28,10) NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'OPEN', close_reason VARCHAR(16),
  opened_at TIMESTAMPTZ NOT NULL, closed_at TIMESTAMPTZ
);
CREATE TABLE portfolio_equity_snapshots (
  portfolio_id UUID NOT NULL REFERENCES paper_portfolios(id), ts TIMESTAMPTZ NOT NULL,
  equity NUMERIC(28,10) NOT NULL, cash NUMERIC(28,10) NOT NULL, open_risk NUMERIC(28,10) NOT NULL,
  PRIMARY KEY(portfolio_id, ts)
);
CREATE TABLE trade_journal (
  id UUID PRIMARY KEY, position_id UUID NOT NULL REFERENCES paper_positions(id),
  notes TEXT, tags TEXT[], emotion VARCHAR(16), followed_plan BOOLEAN,
  screenshot_ref TEXT, ai_postmortem TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== News =====
CREATE TABLE news_articles (               -- immutable
  id UUID PRIMARY KEY, source VARCHAR(48) NOT NULL, url TEXT, title TEXT NOT NULL, body TEXT,
  content_hash CHAR(64) NOT NULL UNIQUE, cluster_id UUID, published_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE news_entities (article_id UUID NOT NULL REFERENCES news_articles(id), instrument_id UUID NOT NULL REFERENCES instruments(id), PRIMARY KEY(article_id, instrument_id));
CREATE TABLE news_sentiment (
  article_id UUID NOT NULL REFERENCES news_articles(id), scorer_version VARCHAR(24) NOT NULL,
  score NUMERIC(4,3) NOT NULL, confidence NUMERIC(4,3) NOT NULL, computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(article_id, scorer_version)
);

-- ===== Alerts & Ops =====
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY, name VARCHAR(64) NOT NULL, dsl TEXT NOT NULL, spec_json JSONB NOT NULL,
  channels TEXT[] NOT NULL, cooldown_minutes INT NOT NULL DEFAULT 30, is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE notification_logs (
  id BIGSERIAL PRIMARY KEY, signal_id UUID REFERENCES signals(id), alert_rule_id UUID REFERENCES alert_rules(id),
  channel VARCHAR(16) NOT NULL, severity VARCHAR(8) NOT NULL, dedup_key VARCHAR(96) NOT NULL,
  payload TEXT NOT NULL, delivered BOOLEAN NOT NULL, attempts SMALLINT NOT NULL DEFAULT 1,
  error TEXT, acknowledged_at TIMESTAMPTZ, sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_dedup ON notification_logs(dedup_key, sent_at DESC);

CREATE TABLE app_settings (key VARCHAR(64) PRIMARY KEY, value_json JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_log (                    -- settings, strategy promotions, manual overrides
  id BIGSERIAL PRIMARY KEY, actor VARCHAR(48) NOT NULL, action VARCHAR(48) NOT NULL,
  entity VARCHAR(48), entity_id TEXT, before_json JSONB, after_json JSONB, at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**SQLite fallback:** allowed only for local dev/unit/integration tests and the zero-install demo. Map `UUID→TEXT`, `JSONB→TEXT(JSON1)`, `NUMERIC→TEXT/REAL via value converters` (use `decimal` ⇄ string converters to avoid precision loss), no hypertables. All repository code MUST go through ports so both providers pass the same contract test suite.

---

## 13. UI / UX Specification

### 13.1 Design Principles
1. **Information density with hierarchy** — pro terminal, not a marketing page.
2. **Trust through transparency** — every number shows freshness; every signal shows *why*, *what could invalidate it*, and *how much data supports it*.
3. **Keyboard-first** — every frequent action has a shortcut and appears in the command palette.
4. **Calm by default** — color and motion only for state changes that matter.
5. **Never lie with empty states** — loading, stale, degraded, offline, and "no data in this market session" are distinct visible states.

### 13.2 Design System (tokens)
- **Theme:** dark default (true-black option for OLED), light theme optional; tokens via CSS variables (`--bg-0..3`, `--fg-0..3`, `--accent`, `--up`, `--down`, `--warn`, `--info`).
- **Semantics:** up/down colors are user-selectable (green/red, blue/orange **colorblind-safe preset**; India vs. Western convention toggle) and are *never the only* channel — add ▲/▼ glyphs.
- **Typography:** UI sans (Inter) + **tabular monospaced numerals** (JetBrains Mono / `font-variant-numeric: tabular-nums`) for all prices; right-aligned numeric columns.
- **Density modes:** Comfortable / Compact / Ultra-compact (row heights 36/28/22 px).
- **Components:** Radix primitives; shared `PriceCell` (flash on tick with throttle, respects reduced motion), `Delta`, `Sparkline`, `RegimeBadge`, `ScoreBadge`, `FreshnessChip`, `QualityChip`, `RiskMeter`, `Kbd`, `EmptyState`, `ErrorBoundary`.

### 13.3 Global Shell
- **Left rail:** collapsible nav with icons + labels, unread counters (signals, alerts).
- **Top bar:** global search (symbol/strategy/page), **market session clocks** (NSE / US / Crypto with OPEN/CLOSED/PRE/POST state and countdown), **global risk status pill** (ok / heat high / circuit breaker tripped), notification bell, theme/density toggle, **timezone selector**.
- **Bottom status bar:** provider LEDs (green/amber/red with latency on hover), SignalR state, last tick age, CPU/memory (dev), build/version, **Kill Switch** (confirm-guarded).
- **Command palette (Ctrl/⌘+K):** go-to-symbol, go-to-page, run scan, create alert, switch layout, toggle theme, "flatten all", "mute symbol 24h".
- **Global shortcuts:** `g d` dashboard, `g s` signals, `/` search, `?` shortcut help, `[`/`]` timeframe step, `1–7` timeframes, `w` add to watchlist, `a` create alert at cursor price, `Esc` close overlays.
- **Layouts:** saveable/named workspace layouts (drag/resize panels via grid layout); **pop-out windows** for multi-monitor (shared state via BroadcastChannel/SignalR).
- **PWA:** installable, offline shell, web push for alerts, mobile-first read-only "companion" views (signals, positions, P&L, health).
- **Accessibility:** WCAG 2.2 AA contrast, full keyboard nav, ARIA live regions for critical alerts, `prefers-reduced-motion`, focus rings, screen-reader labels on charts (data-table alternative view).

### 13.4 Page Inventory (v1 pages + new)
| Route | Page | Highlights |
|---|---|---|
| `/` | **Cockpit Dashboard** | Customizable widget grid: ticker tape, global regime strip, **market breadth panel**, **sector-rotation heatmap**, top signals, unusual volume, watchlist, **today's P&L & portfolio heat**, **upcoming events (24h)**, **system health summary**, "What changed since last visit" digest |
| `/markets` | Markets | Per-market tabs (NSE, BSE, MCX, US, Crypto): breadth, A/D, new highs/lows, **treemap heatmap by sector/market-cap**, index regime, VIX panel, top gainers/losers/volume |
| `/watchlist` | Watchlists & Scanners | Folders, drag-reorder, custom columns, saved scan presets, "new since last run" diff, bulk actions, import/export CSV |
| `/signals` | Signals | Live feed + history, filters (market/strategy/score/regime/status/mode), **signal detail drawer** (see §13.6), compare-to-outcome, shadow vs. live toggle |
| `/instrument/:symbol` | Instrument Deep Dive | Chart, multi-TF panel, indicator values table, regime history timeline, levels, fundamentals, events, news, signals & their outcomes, **notes**, data-quality chip |
| `/charts` | Chart Studio | 1×1/1×2/2×2/3-synced (1D/1h/15m), drawing tools (trendline, rectangle, fib, horizontal ray, text) persisted per symbol, **crosshair sync**, indicator templates, regime shading, event markers, signal & trade markers, replay mode |
| `/replay` *(new)* | **Market Replay / Time Machine** | Scrub historical days bar-by-bar through the *live engine* (using `IClock`) to see exactly what ProStock would have shown; speed control; step-forward; used for debugging and training |
| `/backtest` | Backtesting Lab | Strategy+version picker, parameter form w/ validation, universe & date picker, cost model & fill-mode selectors, **run queue with progress**, results: summary KPIs, equity+drawdown, monthly heatmap, regime-sliced stats, parameter-sensitivity heatmap, trade table (sortable, click → chart at trade), Monte Carlo fan chart, **compare runs side-by-side**, bias badges |
| `/strategies` *(new)* | Strategy Registry | Versions, state (Draft→Shadow→Active→Retired), config diff between versions, live vs. backtest decay chart, promote/demote with checklist |
| `/papertrading` | Paper Terminal | Order ticket (with live **risk preview**: qty, $ risk, R:R, portfolio heat after), DOM-lite quote panel, positions with inline stop/target drag on chart, orders/fills tabs, kill switch |
| `/portfolio` | Performance Analytics | Equity curve vs. benchmark, rolling Sharpe, win/loss distribution, R-multiple histogram, MAE/MFE scatter, P&L by market/strategy/regime/hour/day-of-week, **exposure & correlation matrix**, drawdown table |
| `/journal` *(new)* | Trade Journal | Chronological trade cards: signal snapshot at entry, chart screenshot, notes/tags/emotion, "followed plan?" toggle, AI post-mortem, **mistake-tag analytics** (e.g., "moved stop", "early exit") |
| `/risk` *(new)* | Risk Console | Live portfolio heat gauge, exposure by sector/market/cluster, guardrail status (each rule with current vs. limit), circuit-breaker history, stress test (−X% market shock), what-if sizing |
| `/news` | News & Sentiment | Clustered feed, sentiment badges + trend sparkline, spike detector, per-symbol filter, AI summary (badged) |
| `/calendar` *(new)* | Events Calendar | Earnings/macro/expiry/holiday timeline, instrument-linked, importance filter, blackout windows shown |
| `/alerts` | Notification Center | Delivery log, failures & retry, **rule builder** (visual + DSL), quiet hours, per-channel filters, test-send |
| `/data` *(new)* | Data Console | Backfill jobs, gap list, data-quality scores, instrument master sync status, corporate actions review, manual refetch |
| `/health` | System Telemetry | Provider LEDs, latency/throughput charts, rate-limit gauges, WS reconnect timeline, queue depths, worker liveness, error log tail, DB size/retention status |
| `/settings` | Settings | Profiles (risk, alerts, display), **secrets entry write-only** (never re-displayed), strategy weight tuning w/ before/after backtest preview, import/export config, audit log viewer, backup/restore |

### 13.5 Charting Specifics
- Lightweight Charts with virtualization; **Adj/Raw toggle**, log/linear scale, session shading, **regime background bands**, **event markers (earnings, expiry)**, **stale-data banner** and gap indicators, volume profile (side histogram), **VWAP + bands anchored (session/event/swing)**.
- **Overlay legend** with live values at crosshair; **indicator templates** (save/load); drawings persisted server-side per user/symbol/timeframe.
- Signal annotation: entry zone as a shaded box, SL/TP as horizontal lines with R labels; hover → mini signal card; click → opens drawer.
- **Performance budget:** 5,000 candles + 4 indicators render ≤ 16 ms/frame during live updates; updates throttled (≤ 4 Hz/symbol) and coalesced.
- **Data-table alternative** for accessibility and copy/export (CSV/PNG snapshot button on every chart).

### 13.6 Signal Detail Drawer (the most important component)
Sections, top to bottom:
1. **Header:** symbol, direction, timeframe, strategy@version, regime badge, freshness, mode (LIVE/SHADOW), status.
2. **Trade plan:** entry zone, SL, T1/T2/T3, R:R, suggested size from current risk profile (with portfolio-heat impact).
3. **Score waterfall:** per-factor contributions, gates passed/failed, **factor coverage %**.
4. **Reasons list:** each rule → value vs. threshold with ✓/✗; click highlights the bars/indicator on the chart.
5. **Invalidation:** "This setup is void if…" (price level, time expiry, regime change, event).
6. **Context:** event risks, data-quality chip, volume-semantics note, correlated open positions.
7. **Evidence:** historical outcomes for this strategy/score bucket/regime **with sample size & CI** (or "insufficient data" — never fake precision).
8. **AI explanation** (collapsed, badged, with "regenerate" and "grounding facts used" expander).
9. **Actions:** Paper trade (prefilled ticket), Mute symbol, Add alert, Add note, Share link.

### 13.7 UX States & Feedback
- **Freshness chips** on every live number (`LIVE`, `3s`, `STALE 2m`, `CLOSED`, `DELAYED`).
- **Skeleton loaders** (not spinners) on grids; optimistic UI for watchlist edits; toast with undo.
- **Degraded-mode banner** when a market feed is down: lists affected symbols and that signals are suspended.
- **Audio cues** (distinct, user-configurable, volume-capped) for target/stop/critical alerts; mutable per category.
- **Error boundaries per widget** so one failure never blanks the cockpit.
- **Onboarding checklist** (connect provider → import universe → run first backtest → enable alerts) and **sample/demo mode** powered by the mock provider.

### 13.8 Frontend Engineering Rules
- TS `strict`; API client generated from OpenAPI; runtime validation (zod) on SignalR payloads.
- SignalR hubs: per-symbol **groups** (subscribe only to visible symbols), server-side **conflation** (latest-wins per symbol at ≤ 4 Hz), MessagePack, automatic reconnect with resync (`sinceSequence` replay) to avoid missed/duplicated updates.
- Heavy lists virtualized (TanStack Virtual); chart/worker calcs off main thread where needed.
- Memory-leak discipline: dispose chart series/subscriptions on unmount; E2E soak test (§20).
- Persisted UI state in `localStorage` with schema versioning/migrations; **no secrets ever in the bundle or storage**.

---

## 14. AI / LLM Layer — Operating Contract
(see §11.3 for guardrails) Additional requirements:
- `ILLMExplanationProvider` implementations: Anthropic (default), OpenAI, Local (Ollama). Provider selected by config; **all prompts live in versioned files** with golden-output tests that check *structure and number-grounding*, not exact wording.
- **Daily Debrief** (scheduled pre-market per region): global overnight moves, regime changes, today's events, open-position risk, top setups — deterministic data block first, LLM prose second.
- **Weekly Review:** auto-generated report of strategy performance vs. baseline, top mistakes from journal tags, data/health incidents.
- Failures never block the pipeline: LLM calls are async, off the signal path.

---

## 15. Observability & Operations

- **Logging:** Serilog structured JSON; correlation IDs (`signal_id`, `instrument`, `provider`); no secrets/PII in logs (redaction filter).
- **Metrics (OpenTelemetry):** ingestion lag per provider, bar-to-signal latency, queue depths, dropped-quote count, WS reconnects, signals/hour by status, suppression reasons histogram, DB write latency, LLM latency/cost, notification success rate.
- **Tracing:** one trace per bar-close evaluation through the pipeline.
- **SLOs (single-user targets):** quote→UI p95 < 500 ms (Tier-1); bar close→signal persisted p95 < 2 s; stale detection within 60 s (configurable) of last tick; API p95 < 300 ms for cached reads; zero duplicate alerts.
- **Self-monitoring:** a **watchdog** (separate lightweight process or external uptime ping, e.g., healthchecks-style dead-man's switch) alerts via Discord/Telegram if the main service stops heartbeating — "who watches the watcher".
- **Health endpoints:** `/health/live`, `/health/ready` (DB, provider connectivity, disk, migrations), `/health/details` (auth-protected).
- **Runbooks** in `docs/runbooks/` for: provider outage, token expiry, DB restore, replay of missed bars, reprocessing after corporate action.

---

## 16. Security

- **Authentication:** single-user but mandatory — passkey/WebAuthn or password + TOTP, short-lived JWT/cookie (HttpOnly, SameSite=Strict), rate-limited login, lockout. If hosted privately, additionally restrict via VPN/Tailscale/Cloudflare Access; never expose the admin API openly.
- **Secrets:** environment variables / .NET User Secrets (dev) / OS keychain or cloud secret store (prod). **Settings UI is write-only for secrets.** Pre-commit secret scanning (gitleaks) + CI check. Rotate on suspicion; document rotation steps.
- **Least privilege:** market-data-only API scopes; broker keys with trading permission forbidden until §22 gate; IP-allowlist keys where providers support it.
- **Transport & headers:** HTTPS/HSTS, strict CORS allowlist, CSP, `X-Content-Type-Options`, rate limiting middleware, request size limits, antiforgery for cookie auth.
- **Supply chain:** pinned dependencies, `dotnet list package --vulnerable` and `npm audit` in CI, Dependabot/Renovate, SBOM generation.
- **Data protection:** encrypted backups; DB credentials not shared with app admin; audit log for settings/promotions/overrides.
- **LLM safety:** news treated as hostile input; no tools/DB write for LLM; outbound payload minimization (no secrets or account balances sent to third-party LLMs unless the user opts in).
- **Disclaimer:** UI footer + onboarding state: research & education tool; no investment advice; paper results do not guarantee live results.

---

## 17. Resolved Decisions (formerly "Open Decisions" in v1 §9)

| ID | Decision | Resolution | Rationale / Conditions |
|---|---|---|---|
| **D1** | Database engine | **PostgreSQL (+TimescaleDB) is the target and should be adopted by Phase 4.** SQLite is allowed for Phases 1–3 *and* tests, behind `ICandleRepository` with a shared contract-test suite. | SQLite handles Phase 1–3 (mock data, indicator work) comfortably. Real ingestion (500 symbols × 1m) makes concurrent write + read, compression, retention, and `COPY` ingestion valuable. **No Docker needed:** install native PostgreSQL for Windows/macOS/Linux, or use a free managed tier (Neon/Supabase) — avoid blocking on Docker Desktop. Docker is recommended for Phase 9 packaging. Do **not** maintain two divergent EF models — keep PG-specific features (JSONB, hypertables) in migrations guarded by provider checks. |
| **D2** | Indicator engine | **Hybrid.** Use `Skender.Stock.Indicators` (or equivalent) as the batch/backtest engine **and as a test oracle**; implement a thin `IIndicator` abstraction; write bespoke incremental (streaming O(1) per bar) versions only for hot-path indicators (EMA, RSI, ATR, VWAP, BB, ADX) and for non-standard ones (FVG, liquidity sweeps, volume profile, swing structure). | Gives speed of delivery and credibility, while cross-validation (custom vs. library vs. pandas-ta/TA-Lib fixture CSVs) catches subtle bugs (Wilder smoothing, seed values, warm-up). Warm-up length is explicit per indicator; signals are suppressed during warm-up. |
| **D3** | Tick storage | **Candles only.** Short in-memory tick ring buffer; no tick persistence. Optional later: persist crypto aggregated trades if order-flow features are added. | Swing/intraday research needs OHLCV. Ticks add TBs of I/O without edge for this scope. |
| **D4** | ML probability | **Rules only through Phase 10.** Add Phase 11 "Calibrated Probability Layer" (LightGBM/XGBoost on logged features + outcomes, walk-forward, calibration curve + Brier, drift monitoring). Until then show historical outcome tables by score bucket (§8.4). | Honors Principle 6; the Outcome Tracker (§8.6) produces the labeled dataset needed later. Log feature vectors from day one. |
| **D5** | Telegram vs. Discord | **Both, with roles.** Telegram = primary interactive (buttons, commands). Discord = secondary/ops + redundancy. Both behind `INotificationProvider`; severity routing decides. | Discord needs only a webhook (fast to ship — implement first in Phase 7); Telegram unlocks two-way control. |
| **D6** | Multi-asset portfolio | **Separate native-currency sub-portfolios** (INR/USD/USDT) with **global risk overlays**: unified INR-equivalent equity view via FX snapshots, global daily-loss breaker, and cross-market correlation-cluster warnings. | Avoids FX-mixing distortions in P&L while retaining true portfolio-level risk control. |
| **D7** | Realtime protocol | **SignalR (MessagePack).** Add server-side conflation, per-symbol groups, and sequence-based resync. | Typed hubs, reconnection, auth integration. Raw WebSockets only for provider-facing connections. |
| **D8** *(new)* | Redis | **Optional/deferred.** In-proc channels + `IMemoryCache` until multi-instance or distributed limits are needed. | Fewer moving parts for a single-user system. |
| **D9** *(new)* | Hosting | Develop locally; run 24/7 on a small always-on VPS/home server (see §18). | Laptop sleep = stale feeds and missed signals. |
| **D10** *(new)* | Timeframe set | 1m, 5m, 15m, 1h, 4h, 1D, 1W; signals allowed on 15m/1h/4h/1D initially. | 1m reserved for execution simulation, not signal generation. |

---

## 18. Deployment, Backup & DR

- **Topology:** one Linux VPS (or home server/NUC) running: API+Workers (single container), PostgreSQL/Timescale, reverse proxy (Caddy/Nginx, TLS), optional Grafana/Seq. India-region latency to NSE feeds and US/crypto feeds is acceptable for non-HFT; choose region near the primary market if desired.
- **Packaging:** Docker Compose for prod (Phase 9); `docker-compose.dev.yml` optional; plain `dotnet run` + `npm run dev` supported for local without Docker.
- **CI/CD:** GitHub Actions: build, test, architecture tests, lint, vulnerability scan, secret scan, container build, migration dry-run. Blue/green not required; **deploy outside market hours** by default (calendar-aware deploy guard).
- **Migrations:** forward-only EF migrations, tested against a copy of prod-like data; automatic pre-migration backup.
- **Backups:** nightly `pg_dump` + WAL archiving (or provider PITR); encrypted off-site copy; **monthly restore drill** documented; config/strategy export as JSON.
- **Recovery behavior:** on restart the system MUST (1) detect gaps since last bar, (2) backfill, (3) re-evaluate missed closed bars in order with `IClock` set to bar-close time (so signals are idempotently regenerated, not duplicated), (4) mark any signal generated during recovery as `RECOVERED` and avoid alerting for signals older than their expiry.
- **Graceful shutdown:** flush candles, persist worker cursors, close WS cleanly.

---

## 19. Phased Roadmap (with exit criteria)

| Phase | Name | Deliverables | Exit Criteria |
|---|---|---|---|
| **0** | Blueprint & Env | This spec approved; ADRs for D1–D10; repo, CI skeleton, coding standards, `IClock`, solution structure, architecture tests | `dotnet build` green; arch test enforces dependency rule |
| **1** | Foundation & Mock Engine | API + worker host; React cockpit shell (nav, status bar, command palette, theme); **mock provider** emitting deterministic synthetic candles (seeded); SignalR end-to-end with conflation; auth stub; SQLite repo | Live synthetic chart updates; reconnect & resync work; 13+ pages routed with empty/loading/error states |
| **2** | Indicators | Indicator abstraction + custom/Skender cross-validated; golden CSV fixtures; property tests (e.g., RSI ∈ [0,100], EMA of constant = constant) | All indicator tests green; warm-up behavior documented & tested |
| **3** | Regime & Signals | Regime state machine w/ hysteresis; strategy interface; scoring w/ renormalization; reasons, gates, suppressed signals; determinism hash; signal drawer UI | Replay test: same inputs ⇒ same hash; every signal has reasons+SL+targets+R:R |
| **4** | Real Data | Binance WS/REST (first: 24/7 testbed) → data-quality engine → candle aggregator → backfill; **migrate to PostgreSQL/Timescale**; then Dhan (India) and Alpaca (US); instrument master, calendar, corporate actions | 72h soak on crypto with zero unhandled gaps; stale detector verified by chaos test (kill connection) |
| **5** | Backtesting | Simulator per §9, cost models, walk-forward, Monte Carlo, comparison UI, run queue | Known-answer tests on a hand-computed strategy; bias badges functional; reproducible runs |
| **6** | Paper Trading | Paper broker (orders/OCO/bracket), fill model shared with backtester, sub-portfolios, risk guardrails, journal, kill switch, outcome tracker | Paper vs. backtest parity test within tolerance on identical data |
| **7** | Notifications | Discord → Telegram (interactive) → web push/email digest; dedup, quiet hours, escalation, rule builder | Zero duplicate alerts in 7-day soak; delivery failure retry verified |
| **8** | News & AI | News connectors, dedup/clustering, deterministic sentiment, LLM explainer/debrief/post-mortem with grounding validator, NL-query DSL | Number-grounding tests pass; injection tests pass |
| **9** | Hardening | Circuit breakers, observability stack, watchdog, backups/DR drill, Docker packaging, security review, performance tuning | SLOs met (§21); restore drill passed |
| **10** | Shadow Validation Period | ≥ 4–8 weeks live shadow tracking across markets; decay monitor active | Live-vs-backtest comparison report reviewed |
| **11** | *(Optional)* Calibrated ML Layer | Feature logging → models → calibration → UI exposure behind flag | Beats rule-only baseline OOS, calibrated (Brier/reliability), drift monitored |
| **12** | *(Optional)* Extensions | Options chain view, Forex/macro, portfolio optimizer, additional strategies | — |

---

## 20. Testing Strategy

- **Unit:** every indicator vs. golden fixtures (≥ 3 independent datasets; tolerance documented); every strategy rule with table-driven cases.
- **Property-based (FsCheck):** invariants — stop is on the correct side of entry; sum of weights = 100 after renormalization; position size never exceeds risk cap; candle OHLC consistency after aggregation; `agg(1m→5m)` equals provider 5m within tolerance.
- **Determinism/Replay:** golden “scenario packs” (candles + calendar + config) with expected signal hashes; CI fails on drift without explicit golden update + changelog.
- **Backtest known-answer:** tiny hand-computed scenarios (including gap-through-stop, both-in-bar ambiguity, partial fills, costs).
- **Integration:** Testcontainers (PostgreSQL/Timescale), provider adapters with recorded fixtures (WireMock/VCR); WS reconnect simulator.
- **Chaos/Resilience:** kill/pause feeds, inject 429/5xx, duplicate/out-of-order bars, clock skew, DB failover; assert stale detection, suppression, recovery, and no duplicate signals/alerts.
- **E2E (Playwright):** key flows (signal → drawer → paper trade; run backtest; alert creation), visual regression on core components, **soak test** (8 h synthetic stream; memory/FD growth bounded).
- **Performance:** load tests at target universe (500 NSE + 500 US + 50 crypto, Tier-1 subset live) verifying SLOs.
- **Security tests:** auth bypass attempts, CORS, header checks, secret-scanning gate.
- **Quality gates in CI:** coverage thresholds on Domain/Indicators/Strategies/Risk/Backtesting (≥ 90% line on pure projects), mutation testing (Stryker.NET) on Indicators/Risk as a periodic job.

---

## 21. Definition of Done (expanded)

**Build & quality**
- [ ] `dotnet build` zero warnings (warnings-as-errors); `dotnet test` green; architecture tests green.
- [ ] `npm run build` + lint + typecheck clean; zero runtime console errors across all routes in dark & light themes.

**Correctness & determinism**
- [ ] Indicators match golden fixtures; warm-up handled.
- [ ] Replay test reproduces identical `DeterminismHash` for scenario packs.
- [ ] Backtester passes known-answer suite; paper broker passes backtest-parity test.
- [ ] Every signal carries reasons, SL, targets, R:R, regime, factor coverage, data-quality score.

**Resilience**
- [ ] Killing a provider connection → instrument flagged stale ≤ configured threshold, signals suppressed with reason, auto-reconnect + gap backfill completes, no phantom signals.
- [ ] Restart recovery regenerates missed bars idempotently; no duplicate signals/alerts.

**Performance (see §15 SLOs)**
- [ ] Quote→UI p95 < 500 ms; bar-close→signal p95 < 2 s; chart updates smooth with 5,000 candles; 8-h soak shows no memory growth trend.

**Product**
- [ ] Backtest runs ≥ 1 year × target universe with all §9.4 metrics, bias badges, and reproducibility.
- [ ] Telegram/Discord deliver formatted, deduplicated alerts; quiet hours & routing verified.
- [ ] All pages in §13.4 render with loading/empty/error/stale states; keyboard shortcuts and command palette work; accessibility audit (axe) has no critical issues.

**Security**
- [ ] Auth enforced on all non-health endpoints; secrets scan clean across full git history; no secrets in client bundle; dependency audit clean or risk-accepted.

**Ops**
- [ ] Backup + restore drill passed; watchdog dead-man's-switch verified; runbooks written.

---

## 22. Live-Readiness Gate (precondition for ever adding execution-capable keys)

All must be true, and a written review recorded in `docs/adr/`:
1. ≥ 8 weeks of live shadow/paper results, ≥ 100 closed trades per strategy being considered.
2. Live expectancy within the backtest confidence band; decay monitor clean.
3. Max live-paper drawdown within the pre-declared limit.
4. Paper-vs-backtest parity validated; slippage assumptions checked against real spreads.
5. Independent kill switch, position/loss limits enforced **server-side at the broker** where supported, order-size sanity limits, and a manual-confirmation mode (human approves each order) before any automation.
6. Separate, minimally-scoped API keys; reviewed security posture; incident runbook.
Even then, v1 policy is **human-in-the-loop approval for every live order**.

---

## 23. Environment & Configuration

```ini
# Runtime
APP_ENV=Development
ASPNETCORE_ENVIRONMENT=Development
PORT=5000
TZ_DEFAULT_DISPLAY=Asia/Kolkata

# Persistence
DatabaseProvider=Postgres                  # Postgres | Sqlite (dev/test only)
DATABASE_URL=Host=localhost;Port=5432;Database=prostock;Username=prostock;Password=CHANGE_ME
SQLITE_PATH=Data Source=prostock.db
REDIS_URL=                                 # optional; empty = in-memory

# Auth
AUTH_MODE=Password+TOTP                    # or Passkey
JWT_SIGNING_KEY=CHANGE_ME_LONG_RANDOM
ALLOWED_ORIGINS=http://localhost:5173

# Market data (READ-ONLY scopes only)
DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=                         # short-lived; renewal workflow required
ALPACA_API_KEY=
ALPACA_API_SECRET=
ALPACA_FEED=iex                            # iex | sip (paid)
BINANCE_API_KEY=                           # optional; public endpoints need none
BINANCE_API_SECRET=

# Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_ALLOWED_USER_IDS=                 # whitelist for two-way commands
DISCORD_WEBHOOK_SIGNALS=
DISCORD_WEBHOOK_OPS=
WEB_PUSH_VAPID_PUBLIC=
WEB_PUSH_VAPID_PRIVATE=
WATCHDOG_PING_URL=                         # dead-man's-switch endpoint

# News & AI (optional)
NEWS_API_KEY=
LLM_PROVIDER=Anthropic                     # Anthropic | OpenAI | Local
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LLM_DAILY_TOKEN_BUDGET=200000

# Feature flags
FF_SHADOW_MODE=true
FF_ML_PROBABILITY=false
FF_LIVE_BROKER=false                       # MUST remain false until §22 gate passes
```
Never commit real values. Provide `.env.example`; CI fails if `.env` is tracked. Config is validated at startup (fail-fast with a clear message).

---

## 24. Build Playbook for AI Coding Agents

Follow these instructions when implementing from this spec.

**Working agreement**
1. Work **one phase at a time** (§19). Do not start Phase N+1 until Phase N exit criteria are met and demonstrated by passing tests.
2. Before coding a phase, output a short plan (files to create, interfaces, tests) and any assumptions; record architecture decisions as ADRs in `docs/adr/NNNN-title.md`.
3. **Tests first for math and rules** (indicators, regime, scoring, sizing, fills, costs). Never "fix" a failing golden test by editing the expected values without documenting why.
4. Keep PRs/commits small, each leaving the build green.

**Hard rules**
- Use `decimal` for all prices, quantities, P&L in domain code. Never `double` for money.
- No `DateTime.Now/UtcNow` in domain/strategy/backtest code — use `IClock`.
- No vendor types outside `Infrastructure/Providers/*`.
- No LLM calls in the signal-generation path; no LLM output may influence any numeric field of a signal.
- Evaluate only **closed** bars; HTF values only from closed HTF bars.
- Every external call goes through the resilience pipeline (§5.3) and rate limiter.
- Never log or return secrets; never put secrets in the frontend.
- Any threshold, weight, window, or constant that could be tuned MUST live in versioned strategy/config — not inline literals.

**Per-feature "Definition of Ready → Done" template**
- *Ready:* acceptance criteria, data needed, interfaces touched, test plan.
- *Done:* unit + property tests, integration test where I/O exists, telemetry added (log/metric), docs/runbook updated, UI states (loading/empty/error/stale) implemented, accessibility check, no new warnings.

**Suggested first prompts (Phase 1)**
1. "Create the solution structure in §4.2 with projects, `Directory.Build.props` (nullable, warnings-as-errors, analyzers), an architecture test enforcing the dependency rule, and `IClock`/`SystemClock`/`FakeClock`."
2. "Implement `MockMarketDataProvider` that deterministically generates seeded OHLCV streams with configurable regime segments (trend, range, volatility spike, gap, outage) — used by tests, demos, and replay."
3. "Implement the SignalR `MarketHub` with per-symbol groups, MessagePack, ≤ 4 Hz conflation, sequence numbers, and a resync endpoint; add a React client store with reconnect + resync."
4. "Build the app shell (left rail, top bar with session clocks, bottom status bar, command palette, theme/density tokens) and route stubs for every page in §13.4 with EmptyState/Skeleton/ErrorBoundary."

---

## 25. Glossary
**ADV** average daily volume · **R / R-multiple** profit or loss expressed in units of initial risk · **MFE/MAE** max favorable/adverse excursion · **RVOL** relative volume · **Portfolio heat** total open risk as % of equity · **Hysteresis** requiring a condition to persist before state change · **Wilson interval** binomial confidence interval suited to small samples · **Deflated Sharpe** Sharpe adjusted for number of trials · **Conflation** dropping intermediate updates to deliver the latest state at a bounded rate · **Dead-man's switch** alert that fires when an expected heartbeat stops.

---

*End of specification v2.0.*
