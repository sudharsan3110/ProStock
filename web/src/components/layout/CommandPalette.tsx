import React, { useState } from 'react';
import { useUI, PageId } from '../../context/UIContext';
import { useMarket } from '../../context/MarketContext';
import { Search, Radio, LineChart, FlaskConical, Terminal, Activity, ShieldCheck, X } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setCurrentPage, addToast } = useUI();
  const { tickers, setActiveSymbol } = useMarket();
  const [query, setQuery] = useState('');

  if (!isCommandPaletteOpen) return null;

  const filteredTickers = tickers.filter(t =>
    t.symbol.toLowerCase().includes(query.toLowerCase()) ||
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    { label: 'Go to Cockpit Dashboard', page: 'dashboard' as PageId, icon: <Activity size={14} /> },
    { label: 'View Signals Matrix', page: 'signals' as PageId, icon: <Radio size={14} /> },
    { label: 'Open Chart Studio', page: 'charts' as PageId, icon: <LineChart size={14} /> },
    { label: 'Open Backtesting Lab', page: 'backtest' as PageId, icon: <FlaskConical size={14} /> },
    { label: 'Open Paper Terminal', page: 'papertrading' as PageId, icon: <Terminal size={14} /> },
    { label: 'Open Risk Console', page: 'risk' as PageId, icon: <ShieldCheck size={14} /> }
  ];

  const handleSelectSymbol = (symbol: string) => {
    setActiveSymbol(symbol);
    setCurrentPage('deepdive');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectAction = (page: PageId) => {
    setCurrentPage(page);
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-bg-1 border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="p-3 bg-bg-2 border-b border-border flex items-center gap-2">
          <Search size={18} className="text-fg-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a symbol or command (e.g. RELIANCE, signals, risk)..."
            className="w-full bg-transparent text-sm text-fg-0 placeholder-fg-3 focus:outline-none font-mono"
          />
          <button onClick={() => setIsCommandPaletteOpen(false)} className="text-fg-3 hover:text-fg-0">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Symbols */}
          <div>
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-fg-3">Instruments</div>
            <div className="space-y-0.5">
              {filteredTickers.slice(0, 5).map(t => (
                <button
                  key={t.symbol}
                  onClick={() => handleSelectSymbol(t.symbol)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-hover text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-fg-0">{t.symbol}</span>
                    <span className="text-xs text-fg-3">{t.name}</span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-fg-0">
                    ₹{t.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-fg-3">Navigation Shortcuts</div>
            <div className="space-y-0.5">
              {actions.map(a => (
                <button
                  key={a.label}
                  onClick={() => handleSelectAction(a.page)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-bg-hover text-left text-xs text-fg-2 hover:text-fg-0 transition-colors"
                >
                  <span className="text-accent">{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 bg-bg-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-fg-3 px-3">
          <span>Navigate with mouse or arrow keys</span>
          <span className="kbd">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
