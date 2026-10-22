import React from 'react';
import { useUI, PageId } from '../../context/UIContext';
import {
  LayoutDashboard,
  Globe,
  ListFilter,
  Radio,
  BarChart2,
  LineChart,
  History,
  FlaskConical,
  Layers,
  Terminal,
  PieChart,
  BookOpen,
  ShieldCheck,
  Newspaper,
  Calendar,
  Activity,
  Settings
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage } = useUI();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'markets', label: 'Markets', icon: <Globe size={18} /> },
    { id: 'watchlist', label: 'Watchlists', icon: <ListFilter size={18} /> },
    { id: 'signals', label: 'Signals', icon: <Radio size={18} />, badge: '4 LIVE' },
    { id: 'deepdive', label: 'Deep Dive', icon: <BarChart2 size={18} /> },
    { id: 'charts', label: 'Chart Studio', icon: <LineChart size={18} /> },
    { id: 'replay', label: 'Market Replay', icon: <History size={18} /> },
    { id: 'backtest', label: 'Backtest Lab', icon: <FlaskConical size={18} /> },
    { id: 'strategies', label: 'Strategies', icon: <Layers size={18} /> },
    { id: 'papertrading', label: 'Paper Terminal', icon: <Terminal size={18} />, badge: '3 POS' },
    { id: 'portfolio', label: 'Performance', icon: <PieChart size={18} /> },
    { id: 'journal', label: 'Trade Journal', icon: <BookOpen size={18} /> },
    { id: 'risk', label: 'Risk Console', icon: <ShieldCheck size={18} /> },
    { id: 'news', label: 'News & AI', icon: <Newspaper size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'health', label: 'System Health', icon: <Activity size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-56 bg-bg-1 border-r border-border flex flex-col justify-between py-3 select-none flex-shrink-0">
      <nav className="space-y-1 px-2 overflow-y-auto flex-1">
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-fg-3">
          Cockpit Views
        </div>

        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                  : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-accent' : 'text-fg-3'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  isActive ? 'bg-accent text-white' : 'bg-bg-3 text-fg-3'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-border text-[11px] font-mono text-fg-3">
        <div>ProStock Architecture</div>
        <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">● Connected (Mock Hub)</div>
      </div>
    </aside>
  );
};
