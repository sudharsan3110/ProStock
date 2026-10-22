import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { StrategyItem } from '../types';
import { Layers, Plus, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

export const StrategiesPage: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);

  useEffect(() => {
    analyticsApi.getStrategies().then(setStrategies).catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-accent" />
          <div>
            <h2 className="text-base font-bold text-fg-0">Quantitative Strategy Registry</h2>
            <p className="text-xs text-fg-3">Version lifecycle (Draft → Shadow → Active → Retired), decay metrics & parameter specs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map(s => {
          const isActive = s.state === 'ACTIVE';
          const isShadow = s.state === 'SHADOW';
          return (
            <div key={s.id} className="pro-card p-5 space-y-4 font-mono">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg-0 font-sans">{s.name}</span>
                    <span className="text-[10px] text-fg-3 px-1.5 py-0.5 rounded bg-bg-3">{s.version}</span>
                  </div>
                  <div className="text-xs text-fg-3 mt-1 font-sans">{s.description}</div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : isShadow
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-700/30 text-gray-400'
                }`}>
                  {s.state}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-bg-2 border border-border">
                  <span className="text-[10px] text-fg-3 uppercase block">Historical Win Rate</span>
                  <span className="font-bold text-emerald-400 text-sm mt-0.5 block">{s.winRate}%</span>
                </div>
                <div className="p-2 rounded bg-bg-2 border border-border">
                  <span className="text-[10px] text-fg-3 uppercase block">Sharpe Ratio</span>
                  <span className="font-bold text-fg-0 text-sm mt-0.5 block">{s.sharpe}</span>
                </div>
                <div className="p-2 rounded bg-bg-2 border border-border">
                  <span className="text-[10px] text-fg-3 uppercase block">Signals (30D)</span>
                  <span className="font-bold text-accent text-sm mt-0.5 block">{s.signalsLast30d}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-fg-3 pt-2 border-t border-border">
                <span>Markets: <strong className="text-fg-1">{s.markets.join(', ')}</strong></span>
                <span>Timeframes: <strong className="text-fg-1">{s.timeframes.join(', ')}</strong></span>
                <span>Decay Risk: <strong className={s.decayRisk === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}>{s.decayRisk}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
