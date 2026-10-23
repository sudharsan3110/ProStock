import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ticker } from '../types';
import { marketApi, MarketOverviewResponse } from '../api/marketApi';
import { signalRManager } from '../api/signalr';

interface MarketContextType {
  overview: MarketOverviewResponse | null;
  tickers: Ticker[];
  activeSymbol: string;
  setActiveSymbol: (sym: string) => void;
  activeTicker: Ticker | undefined;
  isLoading: boolean;
  refreshMarketData: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<string>('RELIANCE');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [ovData, tickData] = await Promise.all([
        marketApi.getOverview(),
        marketApi.getTickers()
      ]);
      setOverview(ovData);
      setTickers(tickData);
    } catch (e) {
      console.error('Error fetching market context data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live quotes over SignalR: Binance-streamed crypto plus the backend's simulated NSE/US
    // feed. Each TickUpdate carries the full ticker, so merge every field it provides.
    const unsubscribe = signalRManager.subscribeTicks(tick => {
      if (!tick?.symbol) return;
      setTickers(prev => {
        let found = false;
        const next = prev.map(t => {
          if (t.symbol !== tick.symbol) return t;
          found = true;
          return { ...t, ...tick } as Ticker;
        });
        // A symbol first seen on the stream (e.g. added via PROSTOCK_BINANCE_SYMBOLS)
        // appears once the tick carries a complete ticker.
        return found || tick.name === undefined ? next : [...next, tick as Ticker];
      });
    });

    // If the stream goes quiet (backend down, Binance disconnected), degrade crypto quotes
    // from LIVE to DELAYED/STALE instead of presenting frozen prices as live.
    const staleCheck = setInterval(() => {
      const now = Date.now();
      setTickers(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (t.market !== 'CRYPTO' || !t.lastUpdated) return t;
          const ageSec = (now - Date.parse(t.lastUpdated)) / 1000;
          const freshness = ageSec <= 5 ? 'LIVE' : ageSec <= 60 ? 'DELAYED' : 'STALE';
          if (freshness === t.freshness) return t;
          changed = true;
          return { ...t, freshness } as Ticker;
        });
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(staleCheck);
    };
  }, []);

  const activeTicker = tickers.find(t => t.symbol === activeSymbol);

  return (
    <MarketContext.Provider
      value={{
        overview,
        tickers,
        activeSymbol,
        setActiveSymbol,
        activeTicker,
        isLoading,
        refreshMarketData: loadData
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within a MarketProvider');
  return context;
};
