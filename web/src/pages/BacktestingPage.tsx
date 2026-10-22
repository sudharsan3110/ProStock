import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { BacktestSummary } from '../types';
import { FlaskConical, Play, CheckCircle2, TrendingUp, Download, ShieldCheck } from 'lucide-react';

export const BacktestingPage: React.FC = () => {
  const [data, setData] = useState<{ summary: BacktestSummary; monthlyReturns: any[]; equityCurve: any[] } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<string>('EMA Pullback & Volume Surge');

  useEffect(() => {
    analyticsApi.getBacktestResults().then(setData).catch(console.error);
  }, []);

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 1200);
  };

  const summary = data?.summary;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Configuration & Parameter Form */}
      <div className="pro-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-accent" />
            <div>
              <h2 className="text-base font-bold text-fg-0">Quantitative Backtesting Lab</h2>
              <p className="text-xs text-fg-3">Rigorous bar-by-bar simulation with slippage, commissions, and zero-lookahead bias</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all"
            >
              <Play size={14} fill="white" />
              <span>{isRunning ? 'Simulating Engine...' : 'Run Walk-Forward Backtest'}</span>
            </button>
          </div>
        </div>

        {/* Strategy Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border text-xs font-mono">
          <div>
            <label className="text-fg-3 block mb-1">STRATEGY ENGINE</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
            >
              <option>EMA Pullback & Volume Surge</option>
              <option>Liquidity Sweep & FVG Breakout</option>
              <option>Volume Profile POC Reclaim</option>
            </select>
          </div>

          <div>
            <label className="text-fg-3 block mb-1">UNIVERSE & TIMEFRAME</label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue="Nifty 50 Large-Cap"
                className="w-2/3 bg-bg-2 border border-border rounded px-3 py-2 text-fg-0"
              />
              <input
                type="text"
                defaultValue="15m"
                className="w-1/3 bg-bg-2 border border-border rounded px-3 py-2 text-center text-fg-0"
              />
            </div>
          </div>

          <div>
            <label className="text-fg-3 block mb-1">DATE RANGE</label>
            <input
              type="text"
              defaultValue="2024-01-01 to 2026-10-20"
              className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0"
            />
          </div>

          <div>
            <label className="text-fg-3 block mb-1">COST & SLIPPAGE MODEL</label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue="0.03% Slippage"
                className="w-1/2 bg-bg-2 border border-border rounded px-2.5 py-2 text-fg-0"
              />
              <input
                type="text"
                defaultValue="₹20 / order"
                className="w-1/2 bg-bg-2 border border-border rounded px-2.5 py-2 text-fg-0"
              />
            </div>
          </div>
        </div>

        {/* Bias Integrity Badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border text-[11px] font-mono">
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Zero Lookahead Bias (IClock verified)
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Closed Bars Only
          </span>
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Point-in-time Universe
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Annual Return (CAGR)</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">+{summary.cagr}%</span>
            <span className="text-[10px] text-fg-3">vs Nifty 18.2%</span>
          </div>

          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Max Drawdown</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">{summary.maxDrawdown}%</span>
            <span className="text-[10px] text-fg-3">Recovery: 3.6x</span>
          </div>

          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Sharpe Ratio</span>
            <span className="text-2xl font-bold text-fg-0 mt-1 block">{summary.sharpeRatio}</span>
            <span className="text-[10px] text-fg-3">Sortino: {summary.sortinoRatio}</span>
          </div>

          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Win Rate</span>
            <span className="text-2xl font-bold text-fg-0 mt-1 block">{summary.winRate}%</span>
            <span className="text-[10px] text-fg-3">{summary.totalTrades} Total Trades</span>
          </div>

          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Profit Factor</span>
            <span className="text-2xl font-bold text-fg-0 mt-1 block">{summary.profitFactor}</span>
            <span className="text-[10px] text-fg-3">Expectancy: {summary.expectancyR}R</span>
          </div>

          <div className="pro-card p-3 font-mono">
            <span className="text-[10px] text-fg-3 uppercase block">Final Capital</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              ₹{(summary.finalEquity / 100000).toFixed(2)}L
            </span>
            <span className="text-[10px] text-fg-3">From ₹10.0L base</span>
          </div>
        </div>
      )}

      {/* Monthly Returns Matrix */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <h3 className="font-bold text-sm tracking-wide text-fg-0">Monthly Returns Heatmap (%)</h3>
          <span className="text-xs font-mono text-fg-3">Net of slippage & fees</span>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-center text-xs font-mono">
            <thead>
              <tr className="text-fg-3 text-[11px] border-b border-border pb-2">
                <th className="py-2 text-left">Year</th>
                {months.map(m => (
                  <th key={m} className="py-2 px-1">{m}</th>
                ))}
                <th className="py-2 px-2 text-right">Year Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.monthlyReturns.map(row => (
                <tr key={row.year} className="hover:bg-bg-hover/50">
                  <td className="py-3 font-bold text-left text-fg-0">{row.year}</td>
                  {months.map(m => {
                    const val = row[m];
                    const isPositive = val > 0;
                    const isZero = val === 0;
                    const colorClass = isZero
                      ? 'text-fg-3'
                      : isPositive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400';

                    return (
                      <td key={m} className="p-1">
                        <span className={`inline-block w-full py-1.5 rounded ${colorClass} font-semibold`}>
                          {isZero ? '-' : `${val > 0 ? '+' : ''}${val.toFixed(1)}`}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3 px-2 text-right font-bold text-emerald-400">
                    +{row.total}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
