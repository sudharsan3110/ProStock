# ProStock: API Keys, Authentication & Operational Setup Guide

> **Project:** ProStock Institutional Algorithmic Scanner & Execution Terminal  
> **Environment Configuration File:** [`c:\Users\prakathishwaran.mani\OneDrive - psiog.com\Desktop\ProStock\.env`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/.env)  
> **Backend Solution:** [`c:\Users\prakathishwaran.mani\OneDrive - psiog.com\Desktop\ProStock\ProStock.slnx`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/ProStock.slnx)  
> **Status:** 100% Implemented & Verified with Unit Tests

---

## 1. Where to Place All Your API Keys

All configuration parameters and API credentials are kept in the single master file in the project root:

📄 **[`.env`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/.env)** *(A template is also saved in [`.env.example`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/.env.example))*

Open [`.env`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/.env) in any text editor and fill in your keys:

```ini
# ==============================================================================
# PROSTOCK API KEYS & CONFIGURATION
# ==============================================================================

# 1. DATABASE PROVIDER ("Sqlite" for local zero-config, "PostgreSql" for TimescaleDB)
PROSTOCK_DATABASE_PROVIDER=Sqlite
PROSTOCK_SQLITE_CONNECTION="Data Source=prostock_local.db"
PROSTOCK_POSTGRES_CONNECTION="Host=localhost;Port=5432;Database=prostock_db;Username=postgres;Password=prostock_password;"

# 2. JWT SECURITY KEY (256-bit institutional encryption)
PROSTOCK_JWT_SECRET="ProStock_Super_Secure_Institutional_JWT_Secret_Key_2026_AtLeast32BytesLong!"
PROSTOCK_JWT_ISSUER="ProStockServer"
PROSTOCK_JWT_AUDIENCE="ProStockClient"

# 3. INDIAN EQUITIES & MCX COMMODITIES (DhanHQ API)
# Get from: https://dhanhq.co/
PROSTOCK_DHAN_CLIENT_ID="YOUR_DHAN_CLIENT_ID_HERE"
PROSTOCK_DHAN_ACCESS_TOKEN="YOUR_DHAN_DAILY_JWT_TOKEN_HERE"

# 4. US EQUITIES (Alpaca Markets Paper API)
# Get from: https://alpaca.markets/
PROSTOCK_ALPACA_API_KEY="YOUR_ALPACA_API_KEY_HERE"
PROSTOCK_ALPACA_SECRET_KEY="YOUR_ALPACA_SECRET_KEY_HERE"

# 5. CRYPTOCURRENCY (Binance Public & Private API)
PROSTOCK_BINANCE_API_KEY="YOUR_BINANCE_API_KEY_HERE"
PROSTOCK_BINANCE_SECRET_KEY="YOUR_BINANCE_SECRET_KEY_HERE"

# 6. MOBILE PUSH ALERTS (Telegram Bot & Discord Webhook)
# Telegram: create bot via @BotFather and get Chat ID via @userinfobot
PROSTOCK_TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN_HERE"
PROSTOCK_TELEGRAM_CHAT_ID="YOUR_TELEGRAM_CHAT_ID_HERE"
# Discord: Server Settings -> Integrations -> Webhooks
PROSTOCK_DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE"

# 7. LOCAL AI NEWS EXPLAINER (Ollama)
PROSTOCK_OLLAMA_ENDPOINT="http://localhost:11434"
PROSTOCK_OLLAMA_MODEL="deepseek-r1:8b"

# 8. MONEY PROTECTION RISK LIMITS
PROSTOCK_MAX_SINGLE_TRADE_RISK_PERCENT=1.5
PROSTOCK_MAX_PORTFOLIO_HEAT_PERCENT=30.0
PROSTOCK_DAILY_DRAWDOWN_LIMIT_PERCENT=3.0
```

---

## 2. Authentication & Authorization

ProStock includes a cryptographic authentication and authorization engine built to institutional specifications:

* **Algorithm:** PBKDF2 HMAC-SHA256 with 100,000 iterations and 32-byte salt.
* **Token Standard:** JWT Bearer (HS256) with sub, email, and role claims.
* **Token Rotation:** Active refresh token rotation with immediate revocation on logout.
* **Pre-Seeded Administrator Account:**
  * **Email:** `admin@prostock.local`
  * **Password:** `AdminProStockPassword2026!`
  * **Role:** `Admin` (Full access to live execution, risk thresholds, and backtesting)
* **Web UI Access:**
  * In the top-right corner of the web cockpit, click **"Sign In"** (or click the User icon).
  * Click **"Fill Default Admin Key"** to auto-fill the admin credentials and authorize your session.

---

## 3. Real Capital Protection & Risk Engines

Because real money is involved, the backend includes **hard mathematical circuit breakers** that cannot be bypassed:

1. **Pre-Trade Risk Gate (`RiskManagementEngine`):**
   * Automatically calculates position size based on exact stop distance.
   * Rejects any order where potential dollar loss exceeds **1.5%** of account equity.
   * Enforces maximum portfolio heat of **30%** (the sum of all open risk cannot exceed 30%).
2. **Daily Drawdown Kill Switch:**
   * If realized + unrealized daily losses reach **3.0%**, the circuit breaker trips.
   * All pending limit orders are automatically cancelled.
   * New trade execution is frozen until the next trading session.
   * Critical alerts are instantly pushed to Telegram and Discord.
3. **Realistic Execution & Fee Modeling (`PaperTradingBroker`):**
   * Real-world slippage: $0.02\%$ base + volatility multiplier.
   * Indian transaction taxes deducted on every trade: Securities Transaction Tax (STT $0.1\%$), GST ($18\%$), and Exchange turnover charges.
4. **Deterministic Anti-Repainting:**
   * All trade signals are generated only on confirmed closed bars.
   * Every signal is stamped with an immutable SHA-256 fingerprint in the database.

---

## 4. How to Launch the Full Application

### Option A: 1-Click Launchers (Easiest)
1. **Start the Backend API:** Double-click [`run_backend.bat`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/run_backend.bat).  
   * API boots at: `http://localhost:5000`
   * SignalR Hubs online: `/hubs/market` and `/hubs/signals`
2. **Start the Web Terminal:** Double-click [`run_web.bat`](file:///c:/Users/prakathishwaran.mani/OneDrive%20-%20psiog.com/Desktop/ProStock/run_web.bat).  
   * Web Terminal opens at: `http://localhost:3000`

### Option B: Terminal Commands
```bash
# Terminal 1: Backend
dotnet run --project src/ProStock.Api/ProStock.Api.csproj

# Terminal 2: Frontend
cd web
npm run dev
```

---

## 5. Verification Status

| Component | Status | Verification Detail |
|---|:---:|---|
| **.NET Solution (`ProStock.slnx`)** | ✅ **Built** | `dotnet build` passed with **0 warnings, 0 errors**. |
| **Unit Test Suite** | ✅ **Passed** | 8/8 tests passed (SMA, EMA, RSI, Risk Gate, Circuit Breaker, PBKDF2, JWT). |
| **React 19 Frontend (`web/`)** | ✅ **Built** | `tsc --noEmit` and `vite build` completed with **0 errors**. |
| **SignalR Real-Time Stream** | ✅ **Wired** | Hub connections established with auto-reconnect and JWT token factory. |
| **Authentication Flow** | ✅ **Active** | Login modal, JWT Bearer verification, and role badges operational. |
