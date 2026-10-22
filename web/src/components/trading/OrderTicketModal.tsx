import React, { useState } from 'react';
import { useUI } from '../../context/UIContext';
import { useTrading } from '../../context/TradingContext';
import { Direction } from '../../types';
import { X, ShieldAlert, Check } from 'lucide-react';

export const OrderTicketModal: React.FC = () => {
  const { orderTicketData, closeOrderTicket, addToast } = useUI();
  const { executeOrder, account } = useTrading();

  if (!orderTicketData) return null;

  const [direction, setDirection] = useState<Direction>(orderTicketData.direction);
  const [quantity, setQuantity] = useState<number>(orderTicketData.suggestedQty || 50);
  const [price, setPrice] = useState<number>(orderTicketData.price);
  const [stopLoss, setStopLoss] = useState<number>(orderTicketData.stopLoss);
  const [targetPrice, setTargetPrice] = useState<number>(orderTicketData.targetPrice);

  const totalValue = Math.round(price * quantity * 100) / 100;
  const dollarRisk = Math.abs(price - stopLoss) * quantity;
  const reward = Math.abs(targetPrice - price) * quantity;
  const riskReward = dollarRisk > 0 ? (reward / dollarRisk).toFixed(2) : '0.00';
  const heatImpact = account ? ((dollarRisk / account.totalEquity) * 100).toFixed(2) : '0.8';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeOrder({
      symbol: orderTicketData.symbol,
      direction,
      quantity,
      price,
      stopLoss,
      targetPrice
    });
    addToast(`Paper Order Filled: ${direction} ${quantity} ${orderTicketData.symbol} @ ₹${price}`, 'success');
    closeOrderTicket();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-bg-1 border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-bg-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-fg-0">{orderTicketData.symbol}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-3 text-fg-2">PAPER TICKET</span>
          </div>
          <button onClick={closeOrderTicket} className="text-fg-3 hover:text-fg-0 p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Side Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-bg-0 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setDirection('LONG')}
              className={`py-2 rounded font-mono font-bold text-xs transition-colors ${
                direction === 'LONG' ? 'bg-emerald-500 text-white shadow' : 'text-fg-3 hover:text-fg-0'
              }`}
            >
              BUY / LONG
            </button>
            <button
              type="button"
              onClick={() => setDirection('SHORT')}
              className={`py-2 rounded font-mono font-bold text-xs transition-colors ${
                direction === 'SHORT' ? 'bg-rose-500 text-white shadow' : 'text-fg-3 hover:text-fg-0'
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="text-fg-3 block mb-1">QUANTITY</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-fg-3 block mb-1">LIMIT PRICE (₹)</label>
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-rose-400 block mb-1">STOP LOSS (₹)</label>
              <input
                type="number"
                step="0.05"
                value={stopLoss}
                onChange={e => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-2 border border-rose-500/30 rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-emerald-400 block mb-1">TARGET PRICE (₹)</label>
              <input
                type="number"
                step="0.05"
                value={targetPrice}
                onChange={e => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-2 border border-emerald-500/30 rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Live Risk Preview Box */}
          <div className="p-3 bg-bg-0/70 rounded-lg border border-border text-xs font-mono space-y-1.5">
            <div className="flex justify-between text-fg-2">
              <span>Order Value:</span>
              <span className="text-fg-0 font-medium">₹{totalValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>Capital at Risk:</span>
              <span className="font-bold">₹{dollarRisk.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Potential Reward:</span>
              <span className="font-bold">₹{reward.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-fg-2 pt-1 border-t border-border">
              <span>Calculated R:R:</span>
              <span className="text-accent font-bold">{riskReward} : 1</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>Portfolio Heat Impact:</span>
              <span>+{heatImpact}%</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={closeOrderTicket}
              className="flex-1 py-2.5 rounded-lg bg-bg-2 hover:bg-bg-hover text-fg-2 font-medium text-xs border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-lg text-white font-bold text-xs transition-colors shadow-lg ${
                direction === 'LONG'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              Confirm Paper Execution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
