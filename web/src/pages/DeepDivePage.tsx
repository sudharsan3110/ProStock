import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useUI } from '../context/UIContext';
import { signalApi } from '../api/signalApi';
import { marketApi } from '../api/marketApi';
import { Candle, Signal } from '../types';
import { InteractiveChart } from '../components/charts/InteractiveChart';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import { BarChart2, Play, Sparkles, TrendingUp, CheckCircle, Shield } from 'lucide-react';

export const DeepDivePage: React.FC = () => {
  const { activeSymbol, activeTicker, tickers, setActiveSymbol } = useMarket();
  const { openOrderTicket, setSelectedSignal, setIsSignalDrawerOpen } = useUI();

  const [candles, setCandles] = useState<Candle[]>([]);
  const [signal, setSignal] = useState<Signal | null>(null);

  useEffect(() => {
    marketApi.getCandles(activeSymbol).then(setCandles).catch(console.error);
    signalApi.getSignals().then(sigs => {
      const match = sigs.find(s => s.symbol === activeSymbol);
      setSignal(match || null);
    }).catch(console.error);
  }, [activeSymbol]);

  const handleInspectSignal = () => {
    if (signal) {
      setSelectedSignal(signal);
      setIsSignalDrawerOpen(true);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Symbol Header & Ticker Bar */}
      <div className="pro-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-fg-0 font-mono tracking-tight">{activeSymbol}</span>
            <span className="text-xs text-fg-3 font-mono">{activeTicker?.name}</span>
            <FreshnessChip state="LIVE" />
          </div>

          <div className="flex items-center gap-3 border-l border-border pl-4">
            <PriceCell price={activeTicker?.price || 0} className="text-xl" />
            <Delta value={activeTicker?.change || 0} percent={activeTicker?.changePercent || 0} />
          </div>
        </div>

        {/* Symbol Quick Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={activeSymbol}
            onChange={e => setActiveSymbol(e.target.value)}
            className="bg-bg-2 border border-border text-xs font-mono rounded px-3 py-1.5 text-fg-0 focus:outline-none focus:border-accent"
          >
            {tickers.map(t => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol} — {t.name}
              </option>
            ))}
          </select>

          {signal && (
            <button
              onClick={handleInspectSignal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent/20 hover:bg-accent/30 text-accent font-mono font-semibold text-xs border border-accent/40 transition-colors"
            >
              <Sparkles size={14} />
              <span>Active Signal ({signal.score.total})</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTicker) {
                openOrderTicket({
                  symbol: activeTicker.symbol,
                  direction: 'LONG',
                  price: activeTicker.price,
                  stopLoss: Math.round(activeTicker.price * 0.985 * 100) / 100,
                  targetPrice: Math.round(activeTicker.price * 1.03 * 100) / 100,
                  suggestedQty: 50
                });
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Play size={14} fill="white" />
            <span>Paper Trade</span>
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <InteractiveChart
        symbol={activeSymbol}
        candles={candles}
        signal={signal}
        height={500}
      />

      {/* Technical Indicators & Multi-Timeframe Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trend & Momentum */}
        <div className="pro-card p-4 space-y-3 font-mono text-xs">
          <h3 className="font-bold uppercase tracking-wider text-fg-3 text-[11px] border-b border-border pb-2">
            Multi-TF Momentum & Trend
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-fg-2">15m Trend:</span>
              <span className="text-emerald-400 font-bold">BULLISH (EMA 20 {'>'} 50)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">1h Trend:</span>
              <span className="text-emerald-400 font-bold">BULLISH (SuperTrend Up)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Daily Trend:</span>
              <span className="text-emerald-400 font-bold">STRONG BULL ({'>'} 200 DMA)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">RSI (14):</span>
              <span className="text-accent font-bold">54.2 (Neutral-Bull)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">ADX (14):</span>
              <span className="text-fg-0 font-bold">32.8 (Trending)</span>
            </div>
          </div>
        </div>

        {/* Volatility & Volume Profile */}
        <div className="pro-card p-4 space-y-3 font-mono text-xs">
          <h3 className="font-bold uppercase tracking-wider text-fg-3 text-[11px] border-b border-border pb-2">
            Volume & Volatility State
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-fg-2">Session VWAP:</span>
              <span className="text-yellow-400 font-bold">₹{activeTicker?.vwap.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">ATR (14):</span>
              <span className="text-fg-0 font-bold">₹{activeTicker?.atr.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Relative Volume:</span>
              <span className="text-accent font-bold">{activeTicker?.relativeVolume}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Bollinger Band Width:</span>
              <span className="text-fg-0 font-bold">2.4% (Compression)</span>
            </div>
          </div>
        </div>

        {/* Quant Regime & Quality */}
        <div className="pro-card p-4 space-y-3 font-mono text-xs">
          <h3 className="font-bold uppercase tracking-wider text-fg-3 text-[11px] border-b border-border pb-2">
            Quant Classification
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-fg-2">Regime State:</span>
              <RegimeBadge regime={activeTicker?.regime || 'TRENDING_BULL'} />
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Quality Score:</span>
              <ScoreBadge score={activeTicker?.score || 85} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Feed Quality:</span>
              <span className="text-emerald-400 font-bold">100% Zero-Loss</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-2">Exchange:</span>
              <span className="text-fg-0">{activeTicker?.exchange}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
