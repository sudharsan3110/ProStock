import React, { useEffect, useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTrading } from '../context/TradingContext';
import { useUI } from '../context/UIContext';
import { signalApi } from '../api/signalApi';
import { signalRManager } from '../api/signalr';
import { useLiveCandles } from '../hooks/useLiveCandles';
import { currencyOf } from '../utils/currency';
import { Signal } from '../types';
import { InteractiveChart } from '../components/charts/InteractiveChart';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { ScoreBadge } from '../components/common/ScoreBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Flame,
  ArrowUpRight,
  Radio,
  Clock,
  Layers
} from 'lucide-react';

export const CockpitDashboard: React.FC = () => {
  const { overview, activeSymbol, setActiveSymbol, activeTicker } = useMarket();
  const { account } = useTrading();
  const { setSelectedSignal, setIsSignalDrawerOpen, setCurrentPage } = useUI();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [timeframe, setTimeframe] = useState('15m');
  const candles = useLiveCandles(activeSymbol, timeframe, activeTicker?.market === 'CRYPTO');
  const cur = currencyOf(activeTicker);

  useEffect(() => {
    signalApi.getSignals().then(setSignals).catch(console.error);
    return signalRManager.subscribeSignals(sig =>
      setSignals(prev => (prev.some(s => s.id === sig.id) ? prev : [sig, ...prev]))
    );
  }, []);

  const activeSignal = React.useMemo(() => {
    return signals.find(s => s.symbol === activeSymbol) || null;
  }, [signals, activeSymbol]);

  const handleRowClick = (sig: Signal) => {
    setSelectedSignal(sig);
    setIsSignalDrawerOpen(true);
    setActiveSymbol(sig.symbol);
  };

  const indices = overview?.indices || [];
  const sectors = overview?.sectors || [];
  const breadth = overview?.marketBreadth;

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* 1. Ticker Tape: Key Indices & VIX */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {indices.map(idx => (
          <div
            key={idx.symbol}
            className="pro-card p-3 flex flex-col justify-between hover:border-border-light transition-colors"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-fg-0">{idx.symbol}</span>
              <span className="text-[10px] font-mono text-fg-3">{idx.market}</span>
            </div>
            <div className="my-1">
              <PriceCell price={idx.price} currency={currencyOf(idx)} className="text-base" />
            </div>
            <div className="text-xs">
              <Delta value={idx.change} percent={idx.changePercent} />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Main Terminal Grid: Chart + Signals + Breadth */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Columns: Live Candlestick & Volume Chart */}
        <div className="lg:col-span-8 space-y-4">
          <InteractiveChart
            symbol={activeSymbol}
            candles={candles}
            signal={activeSignal}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            freshness={activeTicker?.freshness}
            height={460}
          />

          {/* Quick Stats Strip */}
          <div className="pro-card p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-fg-3 block text-[10px]">CURRENT REGIME</span>
              <RegimeBadge regime={activeTicker?.regime || 'TRENDING_BULL'} className="mt-1" />
            </div>
            <div>
              <span className="text-fg-3 block text-[10px]">AVG 20D VOLUME</span>
              <span className="text-fg-0 font-semibold mt-1 block">
                {activeTicker?.avgVolume.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-fg-3 block text-[10px]">RELATIVE VOL (RVOL)</span>
              <span className="text-accent font-semibold mt-1 block">
                {activeTicker?.relativeVolume}x
              </span>
            </div>
            <div>
              <span className="text-fg-3 block text-[10px]">ATR (14)</span>
              <span className="text-fg-0 font-semibold mt-1 block">
                {cur}{activeTicker?.atr.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Market Breadth, Portfolio Heat & Today's Digest */}
        <div className="lg:col-span-4 space-y-4">
          {/* Portfolio & Heat Card */}
          <div className="pro-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-fg-3 font-semibold uppercase">Account Equity</span>
              <span className="text-emerald-400 font-bold">Paper Terminal</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold font-mono text-fg-0">
                  ₹{account?.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs mt-0.5">
                  <Delta value={account?.dailyPnL || 14250} percent={account?.dailyPnLPercent || 2.7} isCurrency />
                  <span className="text-fg-3 text-[10px] ml-1">Today</span>
                </div>
              </div>

              {/* Heat bar */}
              <div className="text-right">
                <div className="text-[11px] font-mono text-fg-3">PORTFOLIO HEAT</div>
                <div className="text-base font-mono font-bold text-amber-400">
                  {account?.portfolioHeatPercent}%
                </div>
              </div>
            </div>

            <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, ((account?.portfolioHeatPercent ?? 28.5) / (account?.maxAllowedHeatPercent || 40)) * 100))}%`
                }}
              />
            </div>
          </div>

          {/* Market Breadth Panel */}
          {breadth && (
            <div className="pro-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-fg-3 font-semibold uppercase">NSE Market Breadth</span>
                <span className="text-fg-2 font-bold">A/D {breadth.ratio}</span>
              </div>

              {/* Advances vs Declines Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">{breadth.advances} Advances</span>
                  <span className="text-rose-400 font-semibold">{breadth.declines} Declines</span>
                </div>
                <div className="w-full bg-rose-500/30 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(breadth.advances / (breadth.advances + breadth.declines)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-1">
                <div className="p-2 rounded bg-bg-2 border border-border">
                  <span className="text-[10px] text-fg-3 block">NEW 52W HIGHS</span>
                  <span className="font-bold text-emerald-400 text-sm">{breadth.newHighs}</span>
                </div>
                <div className="p-2 rounded bg-bg-2 border border-border">
                  <span className="text-[10px] text-fg-3 block">NEW 52W LOWS</span>
                  <span className="font-bold text-rose-400 text-sm">{breadth.newLows}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Pre-Market Digest Card */}
          <div className="pro-card p-4 space-y-2 bg-gradient-to-br from-bg-1 to-bg-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-accent font-semibold">
                <Sparkles size={14} />
                <span>AI Daily Intelligence</span>
              </div>
              <span className="text-[10px] font-mono text-fg-3">09:15 AM IST</span>
            </div>
            <p className="text-xs text-fg-1 leading-relaxed">
              Global overnight cues bullish. Nifty open confirmed continuation above 25,100 support. Top rotational inflows observed in <strong className="text-fg-0">IT</strong> and <strong className="text-fg-0">Auto</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: High-Conviction Signals Matrix */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-accent animate-pulse" />
            <h3 className="font-bold text-sm tracking-wide text-fg-0">Live Algorithmic Signals Matrix</h3>
            <span className="text-xs font-mono text-fg-3">({signals.length} verified setups)</span>
          </div>
          <button
            onClick={() => setCurrentPage('signals')}
            className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
          >
            <span>View All Signals</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-2/60 text-fg-3 font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Instrument</th>
                <th className="py-2.5 px-4">Direction</th>
                <th className="py-2.5 px-4">Timeframe</th>
                <th className="py-2.5 px-4">Strategy</th>
                <th className="py-2.5 px-4">Entry Zone</th>
                <th className="py-2.5 px-4">Stop Loss</th>
                <th className="py-2.5 px-4">Target 1</th>
                <th className="py-2.5 px-4">R:R</th>
                <th className="py-2.5 px-4">Score</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {signals.map(sig => {
                const isLong = sig.direction === 'LONG';
                const sc = currencyOf(sig);
                return (
                  <tr
                    key={sig.id}
                    onClick={() => handleRowClick(sig)}
                    className="hover:bg-bg-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-fg-0">
                      <div className="flex items-center gap-1.5">
                        <span>{sig.symbol}</span>
                        <span className="text-[10px] text-fg-3 font-normal">({sig.market})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${
                        isLong ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isLong ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {sig.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-fg-2">{sig.timeframe}</td>
                    <td className="py-3 px-4 text-fg-1">{sig.strategy.name}</td>
                    <td className="py-3 px-4 text-fg-0">{sc}{sig.plan.entryMin} - {sc}{sig.plan.entryMax}</td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">{sc}{sig.plan.stopLoss.toFixed(2)}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{sc}{sig.plan.target1.toFixed(2)}</td>
                    <td className="py-3 px-4 text-fg-0 font-bold">{sig.plan.riskReward}:1</td>
                    <td className="py-3 px-4">
                      <ScoreBadge score={sig.score.total} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {sig.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(sig);
                        }}
                        className="px-2.5 py-1 rounded bg-accent/15 hover:bg-accent/25 text-accent text-[11px] font-semibold border border-accent/30 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
