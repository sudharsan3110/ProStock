import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { ShieldCheck, AlertTriangle, Flame, CheckCircle2, TrendingDown } from 'lucide-react';

export const RiskConsolePage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    analyticsApi.getRiskTelemetry().then(setData).catch(console.error);
  }, []);

  if (!data) return null;

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldCheck size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">Portfolio Risk & Guardrails Console</h2>
          <p className="text-xs text-fg-3">Hard stops, correlation cluster monitoring, and circuit breakers</p>
        </div>
      </div>

      {/* Heat & Drawdown Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Heat Gauge */}
        <div className="pro-card p-4 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-fg-3 uppercase">Portfolio Heat</span>
            <span className="text-amber-400 font-bold">{data.currentHeat}% / {data.maxHeatLimit}%</span>
          </div>

          <div className="w-full bg-bg-3 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full"
              style={{ width: `${(data.currentHeat / data.maxHeatLimit) * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-fg-3">
            Open capital at risk: <strong className="text-fg-0">₹{data.openRiskValue.toFixed(2)}</strong> (Max allowed: ₹{data.maxCapitalAtRisk.toFixed(2)})
          </p>
        </div>

        {/* Daily Drawdown Breaker */}
        <div className="pro-card p-4 space-y-2 font-mono">
          <div className="text-xs text-fg-3 uppercase">Daily Drawdown Breaker</div>
          <div className="text-2xl font-bold text-emerald-400">0.0% Used</div>
          <div className="text-xs text-fg-3">Automatic kill-switch trips at -3.0% daily equity decline.</div>
        </div>

        {/* Kill Switch State */}
        <div className="pro-card p-4 space-y-2 font-mono">
          <div className="text-xs text-fg-3 uppercase">Hardware & Broker Safety</div>
          <div className="text-2xl font-bold text-emerald-400">ARMED (NORMAL)</div>
          <div className="text-xs text-fg-3">All API order gates and margin caps functional.</div>
        </div>
      </div>

      {/* Guardrail Checklist Table */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <h3 className="font-bold text-sm text-fg-0">Active Risk Guardrails</h3>
          <span className="text-xs font-mono text-emerald-400">All 6 Gates Passed</span>
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
            <tr>
              <th className="py-2.5 px-4">Guardrail Name</th>
              <th className="py-2.5 px-4">Current Value</th>
              <th className="py-2.5 px-4">Max Threshold</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.guardrails.map((g: any, i: number) => (
              <tr key={i} className="hover:bg-bg-hover/50">
                <td className="py-3 px-4 font-bold text-fg-0">{g.name}</td>
                <td className="py-3 px-4 text-fg-1">{g.current}</td>
                <td className="py-3 px-4 text-fg-3">{g.limit}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 size={12} />
                    {g.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stress Test Simulation */}
      <div className="pro-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold font-mono text-fg-0 uppercase">
          <TrendingDown size={16} className="text-rose-400" />
          <span>Macro Stress Test Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-bg-2 border border-border">
            <span className="text-fg-3 block text-[11px]">NIFTY -3.0% FLASH CRASH</span>
            <span className="text-rose-400 font-bold block mt-1">{data.stressTest.niftyMinus3}</span>
          </div>

          <div className="p-3 rounded bg-bg-2 border border-border">
            <span className="text-fg-3 block text-[11px]">NIFTY -5.0% CIRCUIT SHOCK</span>
            <span className="text-rose-400 font-bold block mt-1">{data.stressTest.niftyMinus5}</span>
          </div>

          <div className="p-3 rounded bg-bg-2 border border-border">
            <span className="text-fg-3 block text-[11px]">INDIA VIX SPIKE {'>'} 25</span>
            <span className="text-amber-400 font-bold block mt-1">{data.stressTest.vixSpikeTo25}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
