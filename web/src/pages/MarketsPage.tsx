import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import { Globe, TrendingUp, TrendingDown, Layers } from 'lucide-react';

export const MarketsPage: React.FC = () => {
  const { overview, tickers, setActiveSymbol } = useMarket();
  const [selectedTab, setSelectedTab] = useState<'NSE' | 'US' | 'CRYPTO'>('NSE');

  const filteredTickers = tickers.filter(t => t.market === selectedTab);
  const sectors = overview?.sectors || [];

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Market Selector Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-accent" />
          <h2 className="text-base font-bold text-fg-0">Markets & Sector Rotation</h2>
        </div>

        <div className="flex items-center gap-1 bg-bg-2 p-1 rounded-lg border border-border text-xs font-mono">
          {(['NSE', 'US', 'CRYPTO'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
                selectedTab === tab ? 'bg-accent text-white shadow' : 'text-fg-3 hover:text-fg-0'
              }`}
            >
              {tab === 'NSE' ? 'NSE / India' : tab === 'US' ? 'US Equities' : 'Crypto 24/7'}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Performance Strip */}
      {selectedTab === 'NSE' && (
        <div className="pro-card p-4 space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-3">
            Sector Rotation Heatmap (Today's Relative Performance)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {sectors.map(sec => {
              const isPositive = sec.changePercent >= 0;
              return (
                <div
                  key={sec.name}
                  className={`p-3 rounded-lg border flex flex-col justify-between ${
                    isPositive
                      ? 'bg-emerald-500/10 border-emerald-500/25'
                      : 'bg-rose-500/10 border-rose-500/25'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-fg-0">{sec.name}</span>
                  <div className="text-base font-mono font-bold my-1">
                    <Delta value={sec.changePercent} percent={sec.changePercent} showIcon={false} />
                  </div>
                  <div className="text-[10px] font-mono text-fg-3">
                    {sec.advances} Adv / {sec.declines} Dec
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tickers Table */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <h3 className="font-bold text-sm text-fg-0">{selectedTab} Universe & Watchlist</h3>
          <span className="text-xs font-mono text-fg-3">{filteredTickers.length} instruments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Sector</th>
                <th className="py-2.5 px-4">Last Price</th>
                <th className="py-2.5 px-4">Change</th>
                <th className="py-2.5 px-4">Day Range (L - H)</th>
                <th className="py-2.5 px-4">Relative Volume</th>
                <th className="py-2.5 px-4">Regime</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickers.map(t => (
                <tr
                  key={t.symbol}
                  onClick={() => setActiveSymbol(t.symbol)}
                  className="hover:bg-bg-hover/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-fg-0">{t.symbol}</td>
                  <td className="py-3 px-4 text-fg-2">{t.name}</td>
                  <td className="py-3 px-4 text-fg-3">{t.sector}</td>
                  <td className="py-3 px-4 font-semibold">
                    <PriceCell price={t.price} />
                  </td>
                  <td className="py-3 px-4">
                    <Delta value={t.change} percent={t.changePercent} />
                  </td>
                  <td className="py-3 px-4 text-fg-3">
                    ₹{t.low.toFixed(1)} - ₹{t.high.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 font-bold text-accent">{t.relativeVolume}x</td>
                  <td className="py-3 px-4">
                    <RegimeBadge regime={t.regime} />
                  </td>
                  <td className="py-3 px-4">
                    <FreshnessChip state={t.freshness} />
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
