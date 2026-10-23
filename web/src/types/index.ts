export type Market = 'NSE' | 'BSE' | 'MCX' | 'US' | 'CRYPTO';
export type Direction = 'LONG' | 'SHORT';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';
export type RegimeType = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING' | 'VOLATILITY_EXPANSION' | 'VOLATILITY_COMPRESSION';
export type FreshnessState = 'LIVE' | '3s' | 'DELAYED' | 'CLOSED' | 'STALE';
export type SignalMode = 'LIVE' | 'SHADOW';
export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'TARGET_1_HIT' | 'TARGET_2_HIT' | 'TARGET_3_HIT' | 'STOPPED_OUT';

export interface Ticker {
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  relativeVolume: number;
  vwap: number;
  atr: number;
  regime: RegimeType;
  score: number;
  freshness: FreshnessState;
  /** Quote-currency display symbol, e.g. "$" for crypto/US, "₹" for NSE. */
  currency?: string;
  tickSize?: number;
  lastUpdated?: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: Market;
  currency?: string;
  high: number;
  low: number;
  volume: number;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  ratio: number;
  newHighs: number;
  newLows: number;
}

export interface MarketSession {
  market: Market;
  status: 'OPEN' | 'CLOSED' | 'PRE' | 'POST';
  timeRemaining: string;
  timezone: string;
  nextSession: string;
}

export interface SectorHeat {
  name: string;
  changePercent: number;
  marketCap: string;
  advances: number;
  declines: number;
  heat: number;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface SignalPlan {
  entryMin: number;
  entryMax: number;
  currentPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  suggestedQty: number;
  dollarRisk: number;
  heatImpactPercent: number;
}

export interface ScoreFactor {
  name: string;
  score: number;
  max: number;
  weight: number;
}

export interface SignalScore {
  total: number;
  factorCoverage: number;
  factors: ScoreFactor[];
  gatesPassed: string[];
}

export interface SignalReason {
  rule: string;
  value: string;
  threshold: string;
  passed: boolean;
  note: string;
}

export interface SignalInvalidation {
  condition: string;
  status: 'SAFE' | 'WARNING' | 'INVALIDATED' | 'ACTIVE';
  current: string;
}

export interface SignalContext {
  eventRisks: string;
  dataQualityScore: string;
  volumeSemantics: string;
  correlatedPositions: string;
}

export interface SignalEvidence {
  historicalWinRate: number;
  sampleSize: number;
  confidenceInterval: string;
  profitFactor: number;
  sharpeRatio: number;
  averageHoldingTime: string;
}

export interface SignalAIExplanation {
  summary: string;
  groundingFacts: string[];
  generatedAt: string;
}

export interface Signal {
  id: string;
  symbol: string;
  market: Market;
  currency?: string;
  direction: Direction;
  timeframe: Timeframe;
  strategy: {
    name: string;
    version: string;
    author: string;
  };
  regime: RegimeType;
  freshness: FreshnessState;
  mode: SignalMode;
  status: SignalStatus;
  plan: SignalPlan;
  score: SignalScore;
  reasons: SignalReason[];
  invalidation: SignalInvalidation[];
  context: SignalContext;
  evidence: SignalEvidence;
  aiExplanation: SignalAIExplanation;
  timestamp: string;
}

export interface PaperAccount {
  accountNumber: string;
  currency: string;
  totalEquity: number;
  cashBalance: number;
  marginUsed: number;
  marginAvailable: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  portfolioHeatPercent: number;
  maxAllowedHeatPercent: number;
  circuitBreakerTripped: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  stopLoss: number;
  targetPrice: number;
  rMultiple: number;
  entryTime: string;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  filledQuantity: number;
  timestamp: string;
}

export interface StrategyItem {
  id: string;
  name: string;
  version: string;
  state: 'ACTIVE' | 'SHADOW' | 'DRAFT' | 'RETIRED';
  author: string;
  description: string;
  timeframes: Timeframe[];
  markets: Market[];
  winRate: number;
  sharpe: number;
  signalsLast30d: number;
  decayRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  promotedAt: string;
}

export interface BacktestSummary {
  strategyName: string;
  version: string;
  testPeriod: string;
  initialCapital: number;
  finalEquity: number;
  cagr: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  expectancyR: number;
  recoveryFactor: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  symbols: string[];
  aiSummary: string;
}

export interface CalendarEvent {
  id: string;
  event: string;
  date: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  market: Market | 'GLOBAL';
  blackout: boolean;
}

export interface SystemHealth {
  status: 'OPTIMAL' | 'DEGRADED' | 'OFFLINE';
  uptime: string;
  startedAt: string;
  providers: {
    name: string;
    status: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
    latencyMs: number;
    droppedTicks: number;
    lastTickAgeSec: number;
    messagesReceived?: number;
    reconnects?: number;
    lastError?: string | null;
  }[];
  pipeline: {
    candleAggregationDelayMs: number;
    signalEvaluationTimeMs: number;
    dbWriteLatencyMs: number;
    signalRConflationHz: number;
    activeSubscribers: number;
    watchdogHeartbeat: string;
  };
  infrastructure: {
    cpuLoad: string;
    ramUsage: string;
    storageUsed: string;
    activeDatabase: string;
  };
}
