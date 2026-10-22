import { apiFetch } from './client';
import { Ticker, MarketIndex, MarketBreadth, MarketSession, SectorHeat, Candle } from '../types';

export interface MarketOverviewResponse {
  timestamp: string;
  indices: MarketIndex[];
  marketBreadth: MarketBreadth;
  marketSessions: MarketSession[];
  sectors: SectorHeat[];
  regimeStatus: {
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
  getCandles: async (symbol: string) => {
    const allCandles = await apiFetch<Record<string, Candle[]>>(`market/candles/${symbol}`, 'candles-15m.json');
    return allCandles[symbol] || allCandles['RELIANCE'] || [];
  }
};
