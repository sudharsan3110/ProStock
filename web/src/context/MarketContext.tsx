import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ticker, MarketSession, MarketBreadth } from '../types';
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

    // Subtle simulated price ticking to mimic live market feed updates
    const interval = setInterval(() => {
      setTickers(prev => prev.map(t => {
        // Randomly tick 1 or 2 symbols
        if (Math.random() > 0.65) {
          const delta = (Math.random() - 0.49) * (t.price * 0.001);
          const newPrice = Math.round((t.price + delta) * 100) / 100;
          const newChange = Math.round((t.change + delta) * 100) / 100;
          const newPct = Math.round((newChange / (newPrice - newChange) * 100) * 100) / 100;
          return {
            ...t,
            price: newPrice,
            change: newChange,
            changePercent: newPct
          };
        }
        return t;
      }));
    }, 2500);

    // Initialize SignalR WebSocket connection for live tick streaming
    try {
      signalRManager.initMarketHub((tick: any) => {
        if (!tick?.symbol) return;
        setTickers(prev => prev.map(t => {
          if (t.symbol === tick.symbol) {
            return {
              ...t,
              price: tick.price ?? t.price,
              change: tick.change ?? t.change,
              changePercent: tick.changePercent ?? t.changePercent,
              high: Math.max(t.high, tick.high ?? t.high),
              low: Math.min(t.low, tick.low ?? t.low),
              volume: tick.volume ?? t.volume
            };
          }
          return t;
        }));
      });
    } catch (err) {
      console.warn('SignalR init skipped:', err);
    }

    return () => clearInterval(interval);
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
