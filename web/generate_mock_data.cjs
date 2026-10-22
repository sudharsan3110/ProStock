const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Generate realistic OHLCV candles for RELIANCE (15m, 120 bars)
function generateCandles(basePrice, volatility, count) {
  const candles = [];
  let price = basePrice;
  const now = new Date('2026-10-20T12:00:00Z').getTime();
  const step = 15 * 60 * 1000;

  for (let i = count; i >= 0; i--) {
    const time = new Date(now - i * step).toISOString();
    const changePct = (Math.random() - 0.48) * volatility;
    const open = Math.round((price) * 100) / 100;
    const close = Math.round((price * (1 + changePct)) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.random() * (volatility * price * 0.5)) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.random() * (volatility * price * 0.5)) * 100) / 100;
    const volume = Math.floor(40000 + Math.random() * 80000);
    const vwap = Math.round(((open + high + low + close) / 4) * 100) / 100;

    candles.push({ time, open, high, low, close, volume, vwap });
    price = close;
  }
  return candles;
}

const candles = {
  RELIANCE: generateCandles(2710.0, 0.0035, 100),
  NIFTY50: generateCandles(25050.0, 0.0025, 100),
  NVDA: generateCandles(136.0, 0.006, 100),
  BTCUSDT: generateCandles(67200.0, 0.005, 100)
};

fs.writeFileSync(path.join(dataDir, 'candles-15m.json'), JSON.stringify(candles, null, 2));

// 2. Paper Portfolio & Orders
const paperPortfolio = {
  account: {
    accountNumber: "PAPER-PRO-9842",
    currency: "INR",
    totalEquity: 542850.00,
    cashBalance: 384120.00,
    marginUsed: 158730.00,
    marginAvailable: 384120.00,
    dailyPnL: 14250.00,
    dailyPnLPercent: 2.70,
    unrealizedPnL: 8940.00,
    realizedPnL: 5310.00,
    portfolioHeatPercent: 28.5,
    maxAllowedHeatPercent: 40.0,
    circuitBreakerTripped: false
  },
  positions: [
    {
      id: "POS-01",
      symbol: "RELIANCE",
      direction: "LONG",
      quantity: 75,
      avgEntryPrice: 2718.50,
      currentPrice: 2742.80,
      marketValue: 205710.00,
      pnl: 1822.50,
      pnlPercent: 0.89,
      stopLoss: 2718.00,
      targetPrice: 2778.00,
      rMultiple: 1.25,
      entryTime: "2026-10-20T09:45:00Z"
    },
    {
      id: "POS-02",
      symbol: "TATAMOTORS",
      direction: "LONG",
      quantity: 150,
      avgEntryPrice: 916.20,
      currentPrice: 932.70,
      marketValue: 139905.00,
      pnl: 2475.00,
      pnlPercent: 1.80,
      stopLoss: 914.00,
      targetPrice: 955.00,
      rMultiple: 1.84,
      entryTime: "2026-10-20T10:15:00Z"
    },
    {
      id: "POS-03",
      symbol: "TCS",
      direction: "LONG",
      quantity: 25,
      avgEntryPrice: 4120.00,
      currentPrice: 4185.50,
      marketValue: 104637.50,
      pnl: 1637.50,
      pnlPercent: 1.59,
      stopLoss: 4080.00,
      targetPrice: 4250.00,
      rMultiple: 1.63,
      entryTime: "2026-10-19T14:30:00Z"
    }
  ],
  orders: [
    {
      id: "ORD-9021",
      symbol: "RELIANCE",
      side: "BUY",
      type: "LIMIT",
      quantity: 75,
      price: 2718.50,
      status: "FILLED",
      filledQuantity: 75,
      timestamp: "2026-10-20T09:45:02Z"
    },
    {
      id: "ORD-9022",
      symbol: "TATAMOTORS",
      side: "BUY",
      type: "LIMIT",
      quantity: 150,
      price: 916.20,
      status: "FILLED",
      filledQuantity: 150,
      timestamp: "2026-10-20T10:15:10Z"
    },
    {
      id: "ORD-9023",
      symbol: "INFY",
      side: "BUY",
      type: "LIMIT",
      quantity: 50,
      price: 1910.00,
      status: "OPEN",
      filledQuantity: 0,
      timestamp: "2026-10-20T11:20:00Z"
    }
  ]
};
fs.writeFileSync(path.join(dataDir, 'paper-portfolio.json'), JSON.stringify(paperPortfolio, null, 2));

// 3. Backtest Results
const backtestResults = {
  summary: {
    strategyName: "EMA Pullback & Volume Surge",
    version: "v2.1.0",
    testPeriod: "Jan 2024 - Oct 2026 (34 Months)",
    initialCapital: 1000000,
    finalEquity: 2486500,
    cagr: 41.8,
    maxDrawdown: -11.4,
    sharpeRatio: 2.42,
    sortinoRatio: 3.15,
    profitFactor: 2.18,
    winRate: 67.2,
    totalTrades: 428,
    winningTrades: 288,
    losingTrades: 140,
    avgWin: 8420,
    avgLoss: -3850,
    expectancyR: 0.88,
    recoveryFactor: 3.66
  },
  monthlyReturns: [
    { year: 2025, Jan: 4.2, Feb: 2.8, Mar: -1.2, Apr: 5.6, May: 3.1, Jun: 1.8, Jul: 6.4, Aug: 2.2, Sep: -0.8, Oct: 4.5, Nov: 3.8, Dec: 5.1, total: 43.8 },
    { year: 2026, Jan: 3.9, Feb: 4.1, Mar: 2.2, Apr: -0.5, May: 4.8, Jun: 3.2, Jul: 5.5, Aug: 2.9, Sep: 3.8, Oct: 2.4, Nov: 0, Dec: 0, total: 36.8 }
  ],
  equityCurve: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    equity: Math.round(1000000 + i * 51000 + Math.sin(i) * 22000),
    benchmark: Math.round(1000000 + i * 28000 + Math.cos(i) * 15000),
    drawdown: Math.min(0, Math.round((Math.sin(i * 1.5) - 0.7) * 4.5 * 100) / 100)
  }))
};
fs.writeFileSync(path.join(dataDir, 'backtest-results.json'), JSON.stringify(backtestResults, null, 2));

// 4. Strategies Registry
const strategies = [
  {
    id: "STRAT-01",
    name: "EMA Pullback & Volume Surge",
    version: "v2.1.0",
    state: "ACTIVE",
    author: "ProStock Core",
    description: "Multi-timeframe trend continuation trading pullbacks to 20/50 EMA stack with institutional volume validation.",
    timeframes: ["15m", "1h"],
    markets: ["NSE", "US"],
    winRate: 67.2,
    sharpe: 2.42,
    signalsLast30d: 38,
    decayRisk: "LOW",
    promotedAt: "2026-08-15"
  },
  {
    id: "STRAT-02",
    name: "Liquidity Sweep & FVG Breakout",
    version: "v1.4.2",
    state: "ACTIVE",
    author: "ProStock Core",
    description: "Identifies stop hunts at key swing highs/lows followed by aggressive impulse fills into Fair Value Gaps.",
    timeframes: ["1h", "4h"],
    markets: ["NSE", "CRYPTO"],
    winRate: 71.2,
    sharpe: 2.45,
    signalsLast30d: 26,
    decayRisk: "LOW",
    promotedAt: "2026-09-01"
  },
  {
    id: "STRAT-03",
    name: "Volume Profile POC Reclaim",
    version: "v1.2.0",
    state: "SHADOW",
    author: "ProStock Core",
    description: "Shadow testing volume profile value area re-entry and acceptance. Forward paper validation phase.",
    timeframes: ["4h", "1D"],
    markets: ["CRYPTO"],
    winRate: 66.8,
    sharpe: 2.10,
    signalsLast30d: 18,
    decayRisk: "MEDIUM",
    promotedAt: "2026-10-05"
  },
  {
    id: "STRAT-04",
    name: "Bollinger Squeeze Mean Reversion",
    version: "v1.0.5",
    state: "RETIRED",
    author: "ProStock Legacy",
    description: "Range-bound mean reversion strategy disabled due to macro high-momentum regime shifts.",
    timeframes: ["15m"],
    markets: ["NSE"],
    winRate: 54.1,
    sharpe: 1.15,
    signalsLast30d: 0,
    decayRisk: "HIGH",
    promotedAt: "2025-11-10"
  }
];
fs.writeFileSync(path.join(dataDir, 'strategies.json'), JSON.stringify(strategies, null, 2));

// 5. Risk Telemetry
const riskTelemetry = {
  currentHeat: 28.5,
  maxHeatLimit: 40.0,
  dailyLossUsed: 0.0,
  dailyLossLimit: 2.5,
  openRiskValue: 7695.00,
  maxCapitalAtRisk: 21714.00,
  guardrails: [
    { name: "Max Single Trade Risk", status: "PASS", current: "0.85%", limit: "1.00%" },
    { name: "Max Sector Exposure (IT)", status: "PASS", current: "19.2%", limit: "30.0%" },
    { name: "Max Sector Exposure (Energy)", status: "PASS", current: "22.5%", limit: "30.0%" },
    { name: "Max Correlated Positions", status: "PASS", current: "2 pairs", limit: "3 pairs" },
    { name: "Daily Drawdown Breaker", status: "PASS", current: "0.0%", limit: "-3.0%" },
    { name: "Kill Switch State", status: "ARMED_OK", current: "NORMAL", limit: "ENGAGED" }
  ],
  sectorExposure: [
    { sector: "Energy", percent: 38.0 },
    { sector: "Automotive", percent: 26.0 },
    { sector: "IT", percent: 19.0 },
    { sector: "Cash / Reserve", percent: 17.0 }
  ],
  stressTest: {
    niftyMinus3: "-2.8% Portfolio Impact (-Rs 15,200)",
    niftyMinus5: "-4.9% Portfolio Impact (-Rs 26,600) [All Stop Losses Trigger]",
    vixSpikeTo25: "Hedging Auto-Engage recommended"
  }
};
fs.writeFileSync(path.join(dataDir, 'risk-telemetry.json'), JSON.stringify(riskTelemetry, null, 2));

// 6. News & Sentiment
const news = [
  {
    id: "NEWS-01",
    headline: "Reliance Retail and Jio Platforms drive Q2 revenue beat; telecom ARPU surges 7.2%",
    source: "Bloomberg / Mint",
    timestamp: "2026-10-20T11:15:00Z",
    sentiment: "BULLISH",
    score: 0.88,
    symbols: ["RELIANCE"],
    aiSummary: "Strong consumer retail footfall and 5G subscriber additions solidify earnings momentum."
  },
  {
    id: "NEWS-02",
    headline: "Auto sector prints highest festival dispatches in 4 years led by commercial vehicles",
    source: "Economic Times",
    timestamp: "2026-10-20T10:45:00Z",
    sentiment: "BULLISH",
    score: 0.92,
    symbols: ["TATAMOTORS", "MARUTI"],
    aiSummary: "Channel checks indicate sustained order bookings and favorable raw material input costs."
  },
  {
    id: "NEWS-03",
    headline: "US Tech Giants accelerate Capex on next-gen AI clusters; custom silicon demand robust",
    source: "Reuters",
    timestamp: "2026-10-20T08:30:00Z",
    sentiment: "BULLISH",
    score: 0.85,
    symbols: ["NVDA", "TCS", "INFY"],
    aiSummary: "Global enterprise cloud transition maintains steady pipeline of multi-year outsourcing contracts."
  },
  {
    id: "NEWS-04",
    headline: "RBI holds repo rate at 6.5%, maintains cautious stance on food inflation while noting resilient GDP",
    source: "RBI Bulletin",
    timestamp: "2026-10-19T14:00:00Z",
    sentiment: "NEUTRAL",
    score: 0.50,
    symbols: ["BANKNIFTY", "HDFCBANK", "SBIN"],
    aiSummary: "Macro stability intact. Banking net interest margins stabilized around cyclical norms."
  }
];
fs.writeFileSync(path.join(dataDir, 'news-sentiment.json'), JSON.stringify(news, null, 2));

// 7. Calendar Events
const calendarEvents = [
  { id: "CAL-01", event: "RBI Monetary Policy Committee Outcome", date: "2026-10-22", impact: "HIGH", market: "NSE", blackout: false },
  { id: "CAL-02", event: "Nifty 50 Weekly Futures & Options Expiry", date: "2026-10-23", impact: "HIGH", market: "NSE", blackout: false },
  { id: "CAL-03", event: "US Federal Reserve FOMC Rate Decision", date: "2026-10-29", impact: "CRITICAL", market: "US", blackout: true },
  { id: "CAL-04", event: "Tata Motors Q2 Earnings Call", date: "2026-11-04", impact: "HIGH", market: "NSE", blackout: true },
  { id: "CAL-05", event: "US Non-Farm Payrolls (NFP)", date: "2026-11-06", impact: "CRITICAL", market: "GLOBAL", blackout: false }
];
fs.writeFileSync(path.join(dataDir, 'calendar-events.json'), JSON.stringify(calendarEvents, null, 2));

// 8. System Health Telemetry
const systemHealth = {
  status: "OPTIMAL",
  uptime: "99.98%",
  startedAt: "2026-10-15T00:00:00Z",
  providers: [
    { name: "Dhan SuperFast API (NSE/BSE)", status: "CONNECTED", latencyMs: 38, droppedTicks: 0, lastTickAgeSec: 0.4 },
    { name: "Polygon.io CTA SIP (US Markets)", status: "CONNECTED", latencyMs: 52, droppedTicks: 0, lastTickAgeSec: 1.2 },
    { name: "Binance Futures WSS (Crypto)", status: "CONNECTED", latencyMs: 24, droppedTicks: 0, lastTickAgeSec: 0.1 }
  ],
  pipeline: {
    candleAggregationDelayMs: 140,
    signalEvaluationTimeMs: 280,
    dbWriteLatencyMs: 6.2,
    signalRConflationHz: 4,
    activeSubscribers: 1,
    watchdogHeartbeat: "HEALTHY"
  },
  infrastructure: {
    cpuLoad: "14%",
    ramUsage: "482 MB / 16 GB",
    storageUsed: "1.4 GB (TimescaleDB Chunks compressed 8.2x)",
    activeDatabase: "PostgreSQL 16 + TimescaleDB (Dual-compatible SQLite fallback ready)"
  }
};
fs.writeFileSync(path.join(dataDir, 'system-health.json'), JSON.stringify(systemHealth, null, 2));

console.log('All mock JSON datasets generated successfully!');
