import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { RegimeBadge } from '../components/common/RegimeBadge';
import { FreshnessChip } from '../components/common/FreshnessChip';
import { Globe } from 'lucide-react';
import { currencyOf, formatCompact, formatMoney } from '../utils/currency';

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

      {/* Crypto 24/7 strip — every figure is derived from the live Binance stream */}
      {selectedTab === 'CRYPTO' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredTickers.length === 0 && (
            <div className="pro-card p-4 text-xs font-mono text-fg-3 md:col-span-3">
              Waiting for Binance market data… (backend offline or PROSTOCK_BINANCE_ENABLED=false)
            </div>
          )}
          {filteredTickers.map(t => {
            const cur = currencyOf(t);
            const range = t.high - t.low;
            const pos = range > 0 ? ((t.price - t.low) / range) * 100 : 50;
            const atrPct = t.price > 0 ? (t.atr / t.price) * 100 : 0;
            return (
              <button
                key={t.symbol}
                onClick={() => setActiveSymbol(t.symbol)}
                className="pro-card p-4 text-left space-y-3 hover:border-border-light transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-fg-0">{t.symbol}</div>
                    <div className="text-[10px] font-mono text-fg-3">{t.name}</div>
                  </div>
                  <FreshnessChip state={t.freshness} />
                </div>
                <div className="flex items-baseline justify-between">
                  <PriceCell price={t.price} currency={cur} className="text-lg" />
                  <Delta value={t.change} percent={t.changePercent} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-fg-3">
                    <span>24h L {formatMoney(t.low, cur)}</span>
                    <span>24h H {formatMoney(t.high, cur)}</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-bg-3">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent"
                      style={{ left: `calc(${Math.min(100, Math.max(0, pos))}% - 4px)` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-fg-3 block">24h VWAP</span>
                    <span className="text-yellow-400 font-semibold">{formatMoney(t.vwap, cur)}</span>
                  </div>
                  <div>
                    <span className="text-fg-3 block">24h VOL</span>
                    <span className="text-fg-0 font-semibold">{formatCompact(t.volume)}</span>
                  </div>
                  <div>
                    <span className="text-fg-3 block">RVOL 20D</span>
                    <span className="text-accent font-semibold">{t.relativeVolume}x</span>
                  </div>
                  <div>
                    <span className="text-fg-3 block">ATR 15m</span>
                    <span className="text-fg-0 font-semibold">{atrPct.toFixed(2)}%</span>
                  </div>
                </div>
                <RegimeBadge regime={t.regime} />
              </button>
            );
          })}
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
                    <PriceCell price={t.price} currency={currencyOf(t)} />
                  </td>
                  <td className="py-3 px-4">
                    <Delta value={t.change} percent={t.changePercent} />
                  </td>
                  <td className="py-3 px-4 text-fg-3">
                    {formatMoney(t.low, currencyOf(t))} - {formatMoney(t.high, currencyOf(t))}
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
