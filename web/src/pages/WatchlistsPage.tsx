import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useUI } from '../context/UIContext';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import { ListFilter, Search, Play, ArrowUpDown } from 'lucide-react';
import { currencyOf, formatMoney } from '../utils/currency';
import { Ticker } from '../types';

const FOLDERS = {
  'NIFTY 50': (t: Ticker) => t.market === 'NSE',
  'TECH LEADERS': (t: Ticker) => /tech|^it$|information technology/i.test(t.sector),
  'CRYPTO HOT': (t: Ticker) => t.market === 'CRYPTO'
} as const;

export const WatchlistsPage: React.FC = () => {
  const { tickers, setActiveSymbol } = useMarket();
  const { setCurrentPage, openOrderTicket } = useUI();
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<'NIFTY 50' | 'TECH LEADERS' | 'CRYPTO HOT'>('NIFTY 50');

  const filtered = tickers
    .filter(FOLDERS[selectedFolder])
    .filter(t =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
    )
    // Hottest first in the crypto folder: largest absolute 24h move.
    .sort((a, b) => selectedFolder === 'CRYPTO HOT' ? Math.abs(b.changePercent) - Math.abs(a.changePercent) : 0);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Header & Watchlist Folder Tabs */}
      <div className="pro-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter size={20} className="text-accent" />
            <div>
              <h2 className="text-base font-bold text-fg-0">Watchlists & Scanner Presets</h2>
              <p className="text-xs text-fg-3">Custom folders, screener metrics, and rapid-execution shortcuts</p>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter watchlist..."
              className="w-full bg-bg-2 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-fg-0 font-mono focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Folders */}
        <div className="flex items-center gap-2 pt-2 border-t border-border text-xs font-mono">
          {(['NIFTY 50', 'TECH LEADERS', 'CRYPTO HOT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                selectedFolder === f ? 'bg-accent text-white shadow' : 'bg-bg-2 text-fg-3 hover:text-fg-0'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="pro-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4">Sector</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Change</th>
                <th className="py-2.5 px-4">High</th>
                <th className="py-2.5 px-4">Low</th>
                <th className="py-2.5 px-4">Volume</th>
                <th className="py-2.5 px-4">RVOL</th>
                <th className="py-2.5 px-4">Regime</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(t => (
                <tr
                  key={t.symbol}
                  onClick={() => {
                    setActiveSymbol(t.symbol);
                    setCurrentPage('deepdive');
                  }}
                  className="hover:bg-bg-hover/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-fg-0 flex items-center gap-2">
                    <span>{t.symbol}</span>
                    <FreshnessChip state={t.freshness} />
                  </td>
                  <td className="py-3 px-4 text-fg-3">{t.sector}</td>
                  <td className="py-3 px-4 font-semibold">
                    <PriceCell price={t.price} currency={currencyOf(t)} />
                  </td>
                  <td className="py-3 px-4">
                    <Delta value={t.change} percent={t.changePercent} />
                  </td>
                  <td className="py-3 px-4 text-emerald-400">{formatMoney(t.high, currencyOf(t))}</td>
                  <td className="py-3 px-4 text-rose-400">{formatMoney(t.low, currencyOf(t))}</td>
                  <td className="py-3 px-4 text-fg-2">{t.volume.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-accent">{t.relativeVolume}x</td>
                  <td className="py-3 px-4">
                    <RegimeBadge regime={t.regime} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openOrderTicket({
                          symbol: t.symbol,
                          direction: 'LONG',
                          price: t.price,
                          stopLoss: Math.round(t.price * 0.985 * 100) / 100,
                          targetPrice: Math.round(t.price * 1.03 * 100) / 100,
                          suggestedQty: 50
                        });
                      }}
                      className="px-2.5 py-1 rounded bg-accent/20 hover:bg-accent/30 text-accent font-semibold text-[11px]"
                    >
                      Trade
                    </button>
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
