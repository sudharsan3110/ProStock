import React, { useState, useEffect } from 'react';
import { signalApi } from '../api/signalApi';
import { signalRManager } from '../api/signalr';
import { currencyOf } from '../utils/currency';
import { Signal, Market, Direction, RegimeType } from '../types';
import { useUI } from '../context/UIContext';
import { useMarket } from '../context/MarketContext';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import { Radio, Search, Filter, TrendingUp, TrendingDown, Play, CheckCircle } from 'lucide-react';

export const SignalsPage: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [search, setSearch] = useState<string>('');

  const { setSelectedSignal, setIsSignalDrawerOpen, openOrderTicket } = useUI();
  const { setActiveSymbol } = useMarket();

  useEffect(() => {
    signalApi.getSignals().then(setSignals).catch(console.error);
    // Signals generated on each closed Binance 15m candle arrive without a refresh.
    return signalRManager.subscribeSignals(sig =>
      setSignals(prev => (prev.some(s => s.id === sig.id) ? prev : [sig, ...prev]))
    );
  }, []);

  const filtered = signals.filter(s => {
    if (marketFilter !== 'ALL' && s.market !== marketFilter) return false;
    if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
    if (s.score.total < minScore) return false;
    if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) && !s.strategy.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleInspect = (sig: Signal) => {
    setSelectedSignal(sig);
    setIsSignalDrawerOpen(true);
    setActiveSymbol(sig.symbol);
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Header & Filter Controls */}
      <div className="pro-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio size={20} className="text-accent animate-pulse" />
            <div>
              <h2 className="text-base font-bold text-fg-0">Real-Time Signals Matrix</h2>
              <p className="text-xs text-fg-3">Multi-strategy deterministic scanner with score waterfall & R:R verification</p>
            </div>
          </div>

          <div className="text-xs font-mono text-fg-2">
            Showing <strong className="text-fg-0">{filtered.length}</strong> of {signals.length} Signals
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border text-xs font-mono">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol or strategy..."
              className="w-full bg-bg-2 border border-border rounded-lg pl-9 pr-3 py-1.5 text-fg-0 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Market */}
          <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-border">
            {['ALL', 'NSE', 'US', 'CRYPTO'].map(m => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  marketFilter === m ? 'bg-accent text-white font-semibold' : 'text-fg-3 hover:text-fg-0'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-border">
            {['ALL', 'LONG', 'SHORT'].map(d => (
              <button
                key={d}
                onClick={() => setDirectionFilter(d)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  directionFilter === d ? 'bg-accent text-white font-semibold' : 'text-fg-3 hover:text-fg-0'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Min Score Slider */}
          <div className="flex items-center gap-2 bg-bg-2 px-3 py-1 rounded-lg border border-border">
            <span className="text-fg-3">Min Score:</span>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              className="w-20 accent-accent cursor-pointer"
            />
            <span className="text-fg-0 font-bold w-6">{minScore}</span>
          </div>
        </div>
      </div>

      {/* Signals Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(sig => {
          const isLong = sig.direction === 'LONG';
          return (
            <div
              key={sig.id}
              onClick={() => handleInspect(sig)}
              className="pro-card p-4 hover:border-accent/50 cursor-pointer transition-all space-y-3 group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-fg-0 group-hover:text-accent transition-colors">
                      {sig.symbol}
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-3 text-fg-3">
                      {sig.timeframe}
                    </span>
                    <FreshnessChip state={sig.freshness} />
                  </div>
                  <div className="text-xs text-fg-3 mt-0.5">{sig.strategy.name}</div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <ScoreBadge score={sig.score.total} size="sm" />
                  <RegimeBadge regime={sig.regime} />
                </div>
              </div>

              {/* Trade Plan Box */}
              <div className="p-3 bg-bg-0/60 rounded-lg border border-border grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div>
                  <div className="text-[10px] text-fg-3 uppercase">Entry Zone</div>
                  <div className="font-bold text-fg-0 mt-0.5">{currencyOf(sig)}{sig.plan.entryMin}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-400 uppercase">Stop Loss</div>
                  <div className="font-bold text-rose-400 mt-0.5">{currencyOf(sig)}{sig.plan.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase">Target 1</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{currencyOf(sig)}{sig.plan.target1.toFixed(2)}</div>
                </div>
              </div>

              {/* Top Factors & Gates */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-fg-3 font-mono text-[11px]">
                  <span>Risk / Reward: <strong className="text-fg-0">{sig.plan.riskReward}:1</strong></span>
                  <span>Win Rate: <strong className="text-emerald-400">{sig.evidence.historicalWinRate}%</strong></span>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {sig.score.gatesPassed.slice(0, 2).map((g, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-3 text-fg-2 border border-border">
                      ✓ {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openOrderTicket({
                      symbol: sig.symbol,
                      direction: sig.direction,
                      price: sig.plan.currentPrice,
                      stopLoss: sig.plan.stopLoss,
                      targetPrice: sig.plan.target1,
                      suggestedQty: sig.plan.suggestedQty
                    });
                  }}
                  className="flex-1 py-1.5 rounded bg-accent/20 hover:bg-accent/30 text-accent font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Paper Trade</span>
                </button>

                <button
                  onClick={() => handleInspect(sig)}
                  className="py-1.5 px-3 rounded bg-bg-2 hover:bg-bg-hover text-fg-1 text-xs border border-border transition-colors font-mono"
                >
                  Inspect Setup
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
