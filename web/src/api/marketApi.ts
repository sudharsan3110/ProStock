import { apiFetch } from './client';
import { Ticker, MarketIndex, MarketBreadth, MarketSession, SectorHeat, Candle } from '../types';

export interface MarketOverviewResponse {
  timestamp?: string;
  indices: MarketIndex[];
  marketBreadth: MarketBreadth;
  marketSessions: MarketSession[];
  sectors: SectorHeat[];
  regimeStatus?: {
    current: string;
    strength: number;
    hysteresisConfirmed: boolean;
    adx: number;
    volatilityState: string;
  };
}

export const marketApi = {
  getOverview: () => apiFetch<MarketOverviewResponse>('market/overview', 'market-overview.json'),
  getTickers: () => apiFetch<Ticker[]>('market/tickers', 'tickers.json'),
  getCandles: async (symbol: string, timeframe: string = '15m') => {
    const allCandles = await apiFetch<Record<string, Candle[]>>(
      `market/candles/${encodeURIComponent(symbol)}?timeframe=${encodeURIComponent(timeframe)}`,
      'candles-15m.json'
    );
    // Never substitute another symbol's history: an empty chart is better than a wrong one.
    return allCandles[symbol] || [];
  }
};
