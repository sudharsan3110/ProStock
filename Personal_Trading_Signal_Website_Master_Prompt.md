# Personal Multi-Market Trading Signal Website — Master Build Prompt & Exact Setup Guide

## 1. Project goal

Build a **personal-use, 24/7 market-analysis and trading-signal website** for one user.

The system should monitor:

- Indian equities: NSE and BSE
- Indian commodities: MCX where the selected data provider supports them
- US stocks/ETFs
- Crypto
- Forex and global commodities as a later extension

The initial system is **research + alerts + paper trading**, not automatic live trading.

The system must never claim that a signal is guaranteed to be profitable. Every signal must be explainable, measurable, backtestable, and paper-traded before being trusted.

---

# 2. Core product

Create a responsive web dashboard with:

### Dashboard
- Overall market status
- Watchlist
- Strong BUY candidates
- Strong SELL candidates
- HOLD/neutral candidates
- Market regime
- Top gainers/losers
- Volume breakouts
- Unusual volatility
- Latest signals
- Latest relevant news
- Signal performance

### Instrument page
For every supported symbol:
- Current price
- Change %
- OHLC
- Volume
- Candlestick chart
- Multiple timeframes
- EMA/SMA
- RSI
- MACD
- VWAP
- Bollinger Bands
- ATR
- Support/resistance
- Volume analysis
- Trend
- Volatility
- News
- Fundamental data when available
- Current signal
- Entry zone
- Stop loss
- Target
- Risk/reward
- Confidence/probability score
- Explanation of why the signal was generated

### Alerts
Send Telegram notifications for:
- BUY
- SELL
- major breakout
- unusual volume
- stop-loss/target events
- major news events
- major market-regime changes

Allow configurable:
- symbols
- minimum signal score
- quiet hours
- alert types
- timeframe

---

# 3. Very important architecture rule

Do NOT make the LLM the trading strategy.

The deterministic backend must calculate:
- indicators
- signal rules
- risk/reward
- position sizing
- backtest metrics

Machine-learning models may calculate probability scores.

The LLM is only an optional interpretation/explanation layer:
- summarize news
- explain a signal
- summarize market conditions
- answer questions about stored market data

Never allow an LLM response alone to execute a trade.

---

# 4. Recommended technology stack

Use:

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- TradingView Lightweight Charts or another suitable charting library
- React Query/TanStack Query

### Backend
Prefer:
- ASP.NET Core Web API
- .NET 8 or later stable version available in the development environment
- Background workers / Hosted Services
- WebSocket/SignalR for live dashboard updates

### Database
- PostgreSQL

Use migrations.
Keep provider/API-specific data ingestion separate from business logic.

### Cache / messaging
Start with:
- Redis

Use it for:
- latest prices
- temporary market state
- rate limiting
- distributed locks if needed

### Background processing
Use .NET BackgroundService initially.
Do not introduce a complex queue unless actual workload requires it.

### Deployment
Use Docker.
Provide:
- Dockerfile
- docker-compose for local development
- production deployment instructions
- health checks
- structured logging

---

# 5. Provider strategy

Use provider abstractions.

Create interfaces such as:

- IMarketDataProvider
- IHistoricalDataProvider
- INewsProvider
- IFundamentalDataProvider
- INotificationProvider
- IBrokerProvider

The rest of the application must NOT directly depend on Dhan/Alpaca/Binance-specific classes.

Example:

MarketDataService
    -> IMarketDataProvider
        -> DhanMarketDataProvider
        -> AlpacaMarketDataProvider
        -> BinanceMarketDataProvider

This allows providers to be replaced later without rewriting the signal engine.

---

# 6. Initial API/data-provider plan

## India — DhanHQ

Use DhanHQ for the initial Indian integration.

Current official DhanHQ information says:
- Trading APIs are free
- Data APIs are listed at ₹499
- live market feeds are available
- historical data is available
- NSE/BSE/other exchange coverage is provided
- MCX support is available through the platform
- API documentation provides market-feed, historical, portfolio and trading functionality

Official sources:
https://dhanhq.co/trading-apis
https://dhanhq.co/docs/v2/

The user must:
1. Create/own a Dhan account.
2. Enable DhanHQ API access.
3. Generate the required credentials/access token.
4. Put credentials in server-side environment variables/secrets.

Do NOT put Dhan credentials in React/frontend code.

Important:
Dhan's current documentation says individual users get free Trading API access, while Data APIs have additional charges. Verify the exact currently applicable plan before implementation/payment.

---

## US — Alpaca

Start with Alpaca Basic/free.

Current official information:
- Basic: $0/month
- equities real-time is limited to IEX
- 30 WebSocket symbols
- 200 historical API calls/minute
- Algo Trader Plus: $99/month
- Algo Trader Plus provides all-US-exchange coverage and unlimited equity WebSocket subscriptions

Source:
https://docs.alpaca.markets/us/docs/about-market-data-api

The user must:
1. Create an Alpaca account.
2. Create API keys.
3. Store keys as backend secrets.
4. Start with Basic.
5. Upgrade only if the IEX-only limitation becomes a real problem.

Do NOT hard-code keys.

---

## Crypto — Binance

Use Binance public market-data APIs initially.

Requirements:
- REST where appropriate
- WebSocket for live streams
- candles
- trades
- ticker
- order book where useful

Do not require trading permissions for version 1.

Only add Binance trading credentials if live trading is explicitly requested later.

---

## Telegram

Use Telegram Bot API.

The Telegram Bot API is free.

The user must:
1. Create a Telegram bot using BotFather.
2. Obtain the bot token.
3. Start the bot from the user's Telegram account.
4. Determine the chat ID.
5. Store bot token and chat ID as backend secrets.

Never expose the bot token in frontend code.

---

# 7. APIs/services the user must obtain themselves

The coding AI cannot create these accounts or legally obtain credentials for the user.

The user must create/configure:

### Required initially
1. Dhan account/API access
2. Alpaca account/API access
3. Binance access if crypto is enabled
4. Telegram bot
5. PostgreSQL database
6. Redis if deployed separately
7. Hosting/server account

### Optional later
8. News API
9. Fundamental-data provider
10. LLM API
11. Forex/global-commodity provider
12. Paid US market-data subscription

The AI must create a `.env.example` file listing required variables without real secrets.

Example:

DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=

ALPACA_API_KEY=
ALPACA_API_SECRET=

BINANCE_API_KEY=
BINANCE_API_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

DATABASE_URL=
REDIS_URL=

LLM_API_KEY=
NEWS_API_KEY=

Never commit `.env`.

---

# 8. Database design

Create PostgreSQL migrations for at least:

users
instruments
exchanges
market_data
candles
watchlists
watchlist_items
technical_indicators
signals
signal_reasons
signal_events
backtest_runs
backtest_trades
paper_positions
paper_orders
paper_trades
portfolio_snapshots
news_articles
news_sentiment
fundamentals
alert_rules
notification_logs
market_sessions
system_health

Do not store every tick forever in the first version.

Use appropriate time-series retention:
- recent intraday data: configurable retention
- daily historical candles: retain much longer
- aggregate older intraday data where possible

Create indexes based on actual queries.

---

# 9. Signal engine

Build a deterministic Signal Engine.

Every signal should have:

- symbol
- market
- timeframe
- timestamp
- direction: BUY / SELL / HOLD
- score
- confidence/probability if statistically justified
- entry zone
- stop loss
- target
- risk/reward
- expiry
- reasons
- strategy version

Example scoring concept:

Technical trend      20%
Momentum              15%
Volume                15%
Volatility             10%
Support/resistance     15%
Market regime          10%
Fundamentals           10%
News sentiment          5%

Do NOT assume these weights are optimal.

Make them configurable and test them through backtesting.

Never describe a score such as 82% as an actual probability unless it has been statistically calibrated.

---

# 10. Market-regime engine

Classify market conditions such as:

- TRENDING_UP
- TRENDING_DOWN
- SIDEWAYS
- HIGH_VOLATILITY
- LOW_VOLATILITY
- UNKNOWN

Signals must behave differently depending on regime.

For example:
- trend-following strategies may be allowed in strong trends
- breakout strategies require volume confirmation
- mean-reversion strategies should be treated differently in trending markets

All decisions must be testable.

---

# 11. Risk engine

Include:

- fixed-risk position sizing
- stop-loss calculation
- target calculation
- risk/reward
- max position exposure
- max daily loss
- portfolio exposure
- correlated-position warning

Default to paper trading.

Do not implement automatic live order execution in version 1.

---

# 12. Backtesting

This is mandatory before claiming that the strategy is useful.

Backtesting must include:
- historical candles
- entry
- exit
- stop loss
- target
- brokerage cost where applicable
- slippage
- spread assumptions where applicable
- position sizing
- maximum concurrent positions

Metrics:
- total return
- CAGR where applicable
- win rate
- average win
- average loss
- profit factor
- expectancy
- maximum drawdown
- Sharpe ratio
- number of trades
- average holding time
- consecutive losses

Avoid look-ahead bias.

Avoid survivorship bias where possible.

Use walk-forward testing.

Do not optimize parameters on the same period used to evaluate the final strategy.

---

# 13. Paper trading

Build a virtual portfolio.

It must:
- receive signals
- simulate entries
- simulate exits
- track P&L
- calculate drawdown
- compare strategies
- record every simulated trade

The user must be able to see:

SIGNAL → PAPER TRADE → RESULT → STRATEGY PERFORMANCE

Only after enough paper-trading evidence should live trading even be considered.

---

# 14. News and AI

Make news providers pluggable.

The system should:
1. Fetch relevant articles.
2. Deduplicate.
3. Map articles to symbols.
4. Store article metadata.
5. Optionally calculate sentiment.
6. Optionally use an LLM to summarize.

AI output must be stored separately from raw news.

Never allow AI-generated news summaries to overwrite the original article metadata.

---

# 15. Notifications

Telegram messages should contain:

🚨 BUY SIGNAL

Symbol:
Market:
Timeframe:
Current price:
Entry:
Stop Loss:
Target:
Risk/Reward:
Signal score:

Why:
- reason 1
- reason 2
- reason 3

Market regime:
News impact:

Backtest context:
Strategy version:

Add a link to the dashboard.

Avoid sending duplicate alerts for the same signal.

---

# 16. 24/7 operation

The system should run continuously.

Implement:
- health checks
- provider connection monitoring
- automatic WebSocket reconnect
- retry with exponential backoff
- API rate-limit handling
- circuit breakers
- structured logging
- error logging
- background worker monitoring
- database connection monitoring
- notification failure logging

If a provider is down:
- mark its data as unavailable
- do NOT generate fake signals
- clearly display stale-data warnings
- do NOT treat old prices as current prices

Every signal must include data timestamp.

---

# 17. Market sessions

Do not assume every market operates 24/7.

Implement market calendars/time zones.

Examples:
- NSE/BSE
- US equities
- crypto
- forex

The system should know when a market is:
- open
- closed
- pre-market
- after-hours
- holiday
- data unavailable

Crypto can be treated differently because it trades continuously.

---

# 18. Security

Mandatory:
- secrets only in environment variables/secret manager
- HTTPS in production
- authentication if dashboard is exposed publicly
- CORS restrictions
- rate limiting
- input validation
- SQL injection protection through ORM/parameterization
- secure password handling if authentication is implemented
- no broker/API secrets in frontend
- no API keys in Git
- `.gitignore` for secrets
- audit logs for sensitive actions

If the site is only for one user, simple authentication is still recommended if exposed to the public internet.

---

# 19. UI requirements

Create a professional trading-dashboard design.

Pages:

1. Dashboard
2. Markets
3. Watchlist
4. Signals
5. Instrument Details
6. Charts
7. Backtesting
8. Paper Trading
9. Portfolio
10. News
11. Alerts
12. Settings
13. System Health

Use dark mode.

Do not overload the screen.

Prioritize:
- current signal
- price
- chart
- reasons
- risk/reward
- recent news
- historical performance

---

# 20. Development phases

## Phase 0 — Planning
Create:
- architecture document
- database schema
- provider interface design
- environment variable list
- API integration plan

Do not start coding until the architecture is documented.

## Phase 1 — Project foundation
Create:
- React frontend
- ASP.NET Core backend
- PostgreSQL
- Redis
- Docker
- configuration
- logging
- health checks

## Phase 2 — Indian market
Integrate Dhan.

Implement:
- authentication
- instrument master
- historical candles
- live market feed
- reconnect handling
- database storage

Test independently.

## Phase 3 — US market
Integrate Alpaca Basic.

Implement:
- historical data
- IEX real-time data
- WebSocket
- reconnect
- symbol mapping

Clearly display that Basic US real-time coverage is IEX.

## Phase 4 — Crypto
Integrate Binance public market data.

## Phase 5 — Technical analysis
Implement and test:
- SMA
- EMA
- RSI
- MACD
- VWAP
- Bollinger Bands
- ATR
- volume analysis
- support/resistance
- trend detection

Write unit tests for indicator calculations.

## Phase 6 — Signal engine
Implement:
- strategy rules
- score
- reasons
- entry
- stop
- target
- R:R
- strategy versioning

## Phase 7 — Backtesting
Implement the full backtesting engine.

Validate it with known historical examples.

## Phase 8 — Paper trading
Connect signals to virtual trades.

## Phase 9 — Telegram
Implement Telegram alerts and deduplication.

## Phase 10 — News
Add news provider.

## Phase 11 — AI
Add optional AI explanations.

## Phase 12 — Dashboard
Complete the UI and real-time updates.

## Phase 13 — Reliability
Test:
- API outage
- network outage
- database outage
- WebSocket disconnect
- rate limits
- stale data
- duplicate events
- server restart

## Phase 14 — Deployment
Deploy with Docker.

Set:
- environment secrets
- database backups
- HTTPS
- monitoring
- logs
- restart policies

## Phase 15 — Paper-trading validation
Run for several weeks.

Do not judge the system based on a few trades.

---

# 21. Free-first strategy

Start with the cheapest possible setup.

Initial target:

- Dhan for India
- Alpaca Basic for US
- Binance for crypto
- Telegram
- free/local PostgreSQL
- free/local Redis
- free/low-cost hosting if required

Do not buy expensive data initially.

Only upgrade when a measured limitation appears.

Examples:

If US data is too limited:
→ consider Alpaca Algo Trader Plus.

If news is insufficient:
→ add a paid news provider.

If forex/global commodities are required:
→ add a suitable provider.

Do not add services simply because they are available.

---

# 22. Exact user setup checklist

The coding AI must create a `SETUP_CHECKLIST.md`.

The user must manually complete:

### Account 1 — Dhan
1. Create Dhan account.
2. Enable DhanHQ.
3. Generate required API credentials.
4. Verify market-data access.
5. Add credentials to `.env`.

### Account 2 — Alpaca
1. Create account.
2. Generate API key/secret.
3. Start with Basic.
4. Add credentials to `.env`.
5. Test US market endpoint.

### Account 3 — Binance
1. Create account if required.
2. Create API credentials only if private endpoints are required.
3. For market data only, prefer public endpoints.
4. Never enable withdrawal permissions for an API key used by this application.

### Account 4 — Telegram
1. Open Telegram.
2. Open BotFather.
3. Create bot.
4. Copy bot token.
5. Start the bot.
6. Obtain chat ID.
7. Add values to `.env`.

### Database
For development:
- PostgreSQL locally through Docker.

For production:
- managed PostgreSQL OR VPS PostgreSQL.

### Redis
For development:
- Redis through Docker.

For production:
- managed Redis or Dockerized Redis on the server.

### Hosting
Choose one:
- AWS
- DigitalOcean
- Hetzner
- another VPS/cloud provider

The user must create the account and billing details.

---

# 23. Environment variables

Create:

`.env.example`

with:

APP_ENV=Development

DATABASE_URL=

REDIS_URL=

DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=

ALPACA_API_KEY=
ALPACA_API_SECRET=

BINANCE_API_KEY=
BINANCE_API_SECRET=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

NEWS_API_KEY=

LLM_API_KEY=

The real `.env` must never be committed.

---

# 24. AI coding-agent rules

The coding AI must:

1. Inspect the existing repository before changing anything.
2. Do not delete working code without justification.
3. Do not rewrite the entire project unnecessarily.
4. Make small, testable changes.
5. Explain important architectural decisions.
6. Run tests after changes.
7. Fix errors before moving to the next phase.
8. Never invent API endpoints.
9. Use official provider documentation.
10. Never hard-code API keys.
11. Never expose secrets in frontend code.
12. Never enable live trading by default.
13. Never claim a signal is guaranteed profitable.
14. Never silently change strategy logic.
15. Version every strategy.
16. Add unit tests for calculations.
17. Add integration tests for provider adapters.
18. Add health checks.
19. Add meaningful logs.
20. Keep provider-specific code isolated behind interfaces.

---

# 25. Live trading rule

DO NOT implement automatic live order execution in the first version.

If live trading is added later:

- require an explicit user setting
- require a separate confirmation
- default to OFF
- provide a kill switch
- enforce daily loss limits
- enforce maximum position size
- log every order
- never let an LLM directly place an order

---

# 26. Legal/compliance note

This project is initially for personal research and personal use.

If the product later:
- gives signals to other people,
- is sold,
- displays/redistributes market data,
- executes trades for others,
- or becomes a public financial service,

stop and review:
- market-data licensing
- exchange redistribution/display rules
- broker API terms
- applicable Indian securities regulations
- tax/accounting requirements
- requirements in other jurisdictions

Do not assume that personal-use API access automatically permits commercial redistribution.

---

# 27. Definition of done

The project is complete only when:

- application starts reliably
- database migrations work
- Dhan integration works
- Alpaca integration works
- Binance integration works
- live data is visible
- historical data is available
- technical indicators are tested
- signal engine works
- every signal has reasons
- backtesting works
- paper trading works
- Telegram alerts work
- duplicate alerts are prevented
- stale data is detected
- provider failures are handled
- dashboard updates live
- secrets are protected
- Docker deployment works
- health checks work
- logs work
- database backup strategy exists
- documentation explains setup and operation

---

# 28. Important principle

The goal is NOT:

"Build an AI that predicts the stock market."

The goal is:

"Build a measurable personal market-research and signal system that combines reliable market data, deterministic technical analysis, fundamentals, news, statistical/ML models, backtesting, risk management, and paper trading."

The system should prove whether a strategy works through data rather than assuming it works.

---

# 29. First instruction to the coding AI

Before writing code:

1. Inspect the repository.
2. Identify existing technology and structure.
3. Create an architecture proposal.
4. Create `PROJECT_PLAN.md`.
5. Create `SETUP_CHECKLIST.md`.
6. Create `.env.example`.
7. Create database schema proposal.
8. Create provider interface proposal.
9. Identify anything that requires a human account/API key/payment.
10. Stop and report the required human actions.

Do NOT begin implementing the entire project in one step.

After the user completes the required setup, proceed one phase at a time.

The coding AI must always tell the user:
- what it completed
- what it needs from the user
- what remains
- how to test the completed phase

Never pretend that an external account, API key, cloud server, database, domain, or paid subscription has been created when it has not.
