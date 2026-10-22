import React from 'react';
import { useTrading } from '../context/TradingContext';
import { useUI } from '../context/UIContext';
import { useMarket } from '../context/MarketContext';
import { PriceCell } from '../components/common/PriceCell';
import { Delta } from '../components/common/Delta';
import { Terminal, Plus, X, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const PaperTradingPage: React.FC = () => {
  const { account, positions, orders, closePosition, cancelOrder } = useTrading();
  const { openOrderTicket, addToast } = useUI();
  const { activeTicker } = useMarket();

  const handleNewOrder = () => {
    if (!activeTicker) return;
    openOrderTicket({
      symbol: activeTicker.symbol,
      direction: 'LONG',
      price: activeTicker.price,
      stopLoss: Math.round(activeTicker.price * 0.985 * 100) / 100,
      targetPrice: Math.round(activeTicker.price * 1.03 * 100) / 100,
      suggestedQty: 50
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Account Overview Strip */}
      <div className="pro-card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div>
          <span className="text-[10px] text-fg-3 uppercase block">Total Equity</span>
          <span className="text-xl font-bold text-fg-0 mt-1 block">
            ₹{account?.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-fg-3 uppercase block">Cash Balance</span>
          <span className="text-xl font-bold text-fg-1 mt-1 block">
            ₹{account?.cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-fg-3 uppercase block">Margin Available</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            ₹{account?.marginAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-fg-3 uppercase block">Daily P&L</span>
          <div className="mt-1">
            <Delta value={account?.dailyPnL || 0} percent={account?.dailyPnLPercent || 0} isCurrency />
          </div>
        </div>
        <div>
          <span className="text-[10px] text-fg-3 uppercase block">Portfolio Heat</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">
            {account?.portfolioHeatPercent}% <span className="text-xs text-fg-3">/ 40%</span>
          </span>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={handleNewOrder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all"
          >
            <Plus size={16} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Active Positions Table */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent" />
            <h3 className="font-bold text-sm tracking-wide text-fg-0">Open Paper Positions</h3>
            <span className="text-xs font-mono text-fg-3">({positions.length} active)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Position ID</th>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4">Side</th>
                <th className="py-2.5 px-4">Quantity</th>
                <th className="py-2.5 px-4">Avg Entry</th>
                <th className="py-2.5 px-4">Current Price</th>
                <th className="py-2.5 px-4">Market Value</th>
                <th className="py-2.5 px-4">Unrealized P&L</th>
                <th className="py-2.5 px-4">Stop Loss</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-fg-3">
                    No active positions. Open a paper trade from the Signals matrix or click New Order.
                  </td>
                </tr>
              ) : (
                positions.map(p => (
                  <tr key={p.id} className="hover:bg-bg-hover/60 transition-colors">
                    <td className="py-3 px-4 text-fg-3">{p.id}</td>
                    <td className="py-3 px-4 font-bold text-fg-0">{p.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {p.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-fg-0">{p.quantity}</td>
                    <td className="py-3 px-4">₹{p.avgEntryPrice.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <PriceCell price={p.currentPrice} />
                    </td>
                    <td className="py-3 px-4 text-fg-1">₹{p.marketValue.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <Delta value={p.pnl} percent={p.pnlPercent} isCurrency />
                    </td>
                    <td className="py-3 px-4 text-rose-400">₹{p.stopLoss.toFixed(2)}</td>
                    <td className="py-3 px-4 text-emerald-400">₹{p.targetPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          closePosition(p.id);
                          addToast(`Closed position ${p.symbol} (${p.quantity} units)`, 'info');
                        }}
                        className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition-colors"
                      >
                        Close Market
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order History */}
      <div className="pro-card overflow-hidden">
        <div className="pro-card-header">
          <h3 className="font-bold text-sm tracking-wide text-fg-0">Order Execution Audit Trail</h3>
          <span className="text-xs font-mono text-fg-3">{orders.length} orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Order ID</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Side</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Filled / Total</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-bg-hover/60 transition-colors">
                  <td className="py-2.5 px-4 text-fg-3">{o.id}</td>
                  <td className="py-2.5 px-4 text-fg-2">{new Date(o.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 px-4 font-bold text-fg-0">{o.symbol}</td>
                  <td className="py-2.5 px-4 text-fg-2">{o.type}</td>
                  <td className="py-2.5 px-4">
                    <span className={o.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {o.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">₹{o.price.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-fg-0">{o.filledQuantity} / {o.quantity}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      o.status === 'FILLED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : o.status === 'OPEN'
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-gray-700/30 text-gray-400'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {o.status === 'OPEN' && (
                      <button
                        onClick={() => cancelOrder(o.id)}
                        className="px-2 py-0.5 rounded bg-bg-3 hover:bg-rose-500/20 text-rose-400 border border-border text-[10px]"
                      >
                        Cancel
                      </button>
                    )}
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
