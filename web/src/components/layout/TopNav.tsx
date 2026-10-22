import React from 'react';
import { useMarket } from '../../context/MarketContext';
import { useTrading } from '../../context/TradingContext';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Shield, Moon, Sun, Clock, Zap, AlertTriangle, User, Lock } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { overview } = useMarket();
  const { account } = useTrading();
  const { setIsCommandPaletteOpen, density, setDensity, addToast } = useUI();
  const { isAuthenticated, user, setIsLoginModalOpen } = useAuth();

  const sessions = overview?.marketSessions || [];
  const heat = account?.portfolioHeatPercent || 28.5;
  const isHeatHigh = heat > 35;

  return (
    <header className="h-14 bg-bg-1 border-b border-border px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center font-mono font-black text-accent text-sm">
            PS
          </div>
          <span className="font-bold text-sm tracking-wide text-fg-0">
            PRO<span className="text-accent">STOCK</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-3 text-fg-3 border border-border">
            v2.1
          </span>
        </div>

        {/* Global Search Button triggering Command Palette */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-2 hover:bg-bg-hover text-fg-2 border border-border text-xs transition-colors w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search size={14} />
            <span>Search symbol, strategy, page...</span>
          </div>
          <span className="kbd">Ctrl K</span>
        </button>
      </div>

      {/* Middle: Market Session Clocks */}
      <div className="hidden lg:flex items-center gap-3">
        {sessions.map(s => {
          const isOpen = s.status === 'OPEN';
          return (
            <div
              key={s.market}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-bg-2 border border-border text-xs font-mono"
            >
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 pulse-led' : 'bg-gray-500'}`} />
              <span className="font-bold text-fg-1">{s.market}</span>
              <span className={isOpen ? 'text-emerald-400 font-semibold' : 'text-fg-3'}>
                {s.status}
              </span>
              <span className="text-[10px] text-fg-3">({s.timeRemaining})</span>
            </div>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Risk Status Pill */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
          isHeatHigh
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        }`}>
          <Shield size={13} />
          <span>HEAT {heat.toFixed(1)}%</span>
          <span className="text-[10px] text-fg-3">/ 40%</span>
        </div>

        {/* Notifications */}
        <button
          onClick={() => addToast('Notification Center: 3 alerts triggered today', 'info')}
          className="p-2 rounded-lg text-fg-2 hover:text-fg-0 hover:bg-bg-2 border border-border transition-colors relative"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>

        {/* Density Toggle */}
        <button
          onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
          className="hidden sm:flex text-[11px] font-mono px-2 py-1 rounded bg-bg-2 hover:bg-bg-hover text-fg-2 border border-border"
          title="Toggle Grid Density"
        >
          {density.toUpperCase()}
        </button>

        {/* Identity & Session Button */}
        <button
          onClick={() => setIsLoginModalOpen(true)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
            isAuthenticated
              ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25'
              : 'bg-bg-2 text-fg-1 border-border hover:bg-bg-hover'
          }`}
          title="User Account & Security"
        >
          {isAuthenticated ? (
            <>
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center font-bold text-[10px]">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <span className="hidden md:inline font-semibold">{user?.role || 'Trader'}</span>
            </>
          ) : (
            <>
              <Lock size={13} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
