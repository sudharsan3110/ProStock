import React from 'react';
import { useTrading } from '../context/TradingContext';
import { PieChart, TrendingUp, ShieldAlert, Award, BarChart3 } from 'lucide-react';

export const PortfolioPage: React.FC = () => {
  const { account, positions } = useTrading();

  const metrics = [
    { label: 'Total Equity', value: `₹${(account?.totalEquity || 542850).toLocaleString('en-IN')}`, change: '+2.70% today', positive: true },
    { label: 'Realized P&L', value: `₹${(account?.realizedPnL || 5310).toLocaleString('en-IN')}`, change: '3 Winning Trades', positive: true },
    { label: 'Unrealized P&L', value: `₹${(account?.unrealizedPnL || 8940).toLocaleString('en-IN')}`, change: `${positions.length} Open Positions`, positive: true },
    { label: 'Profit Factor', value: '2.34', change: 'Expectancy: +0.92R', positive: true },
    { label: 'Sharpe Ratio', value: '2.48', change: 'Annualized', positive: true },
    { label: 'Max Drawdown', value: '-4.2%', change: 'Peak-to-Trough', positive: false }
  ];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <PieChart size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">Portfolio Performance Analytics</h2>
          <p className="text-xs text-fg-3">Trade outcomes, R-multiple distributions, and rolling risk-adjusted metrics</p>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {metrics.map(m => (
          <div key={m.label} className="pro-card p-3">
            <span className="text-[10px] text-fg-3 uppercase block">{m.label}</span>
            <span className="text-xl font-bold text-fg-0 mt-1 block">{m.value}</span>
            <span className={`text-[11px] block mt-0.5 ${m.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {m.change}
            </span>
          </div>
        ))}
      </div>

      {/* R-Multiple Distribution & Exposure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* R-Multiple Histogram */}
        <div className="pro-card p-4 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-fg-0 font-sans">R-Multiple Outcome Distribution</h3>
            <span className="text-xs text-fg-3">Last 60 Trades</span>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            {[
              { r: '> +3.0R', pct: 18, count: 11, color: 'bg-emerald-500' },
              { r: '+2.0R to +3.0R', pct: 28, count: 17, color: 'bg-emerald-500' },
              { r: '+1.0R to +2.0R', pct: 22, count: 13, color: 'bg-emerald-400' },
              { r: '0.0R to +1.0R', pct: 8, count: 5, color: 'bg-accent' },
              { r: '-1.0R (Full SL)', pct: 24, count: 14, color: 'bg-rose-500' }
            ].map(bucket => (
              <div key={bucket.r} className="space-y-1">
                <div className="flex justify-between text-fg-2">
                  <span>{bucket.r}</span>
                  <span className="font-bold text-fg-0">{bucket.count} trades ({bucket.pct}%)</span>
                </div>
                <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${bucket.color}`} style={{ width: `${bucket.pct * 2.5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Concentration */}
        <div className="pro-card p-4 space-y-3 font-mono">
          <h3 className="font-bold text-sm text-fg-0 font-sans">Active Capital Allocation</h3>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between text-fg-2 mb-1">
                <span>Energy (RELIANCE)</span>
                <span className="font-bold text-fg-0">38.0%</span>
              </div>
              <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: '38%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-fg-2 mb-1">
                <span>Automotive (TATAMOTORS)</span>
                <span className="font-bold text-fg-0">26.0%</span>
              </div>
              <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '26%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-fg-2 mb-1">
                <span>IT Services (TCS)</span>
                <span className="font-bold text-fg-0">19.0%</span>
              </div>
              <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: '19%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-fg-2 mb-1">
                <span>Cash Reserve</span>
                <span className="font-bold text-fg-0">17.0%</span>
              </div>
              <div className="w-full bg-bg-3 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gray-500" style={{ width: '17%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
