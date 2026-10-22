import React from 'react';
import { MarketProvider } from './context/MarketContext';
import { TradingProvider } from './context/TradingContext';
import { UIProvider, useUI } from './context/UIContext';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPalette } from './components/layout/CommandPalette';
import { SignalDetailDrawer } from './components/signals/SignalDetailDrawer';
import { OrderTicketModal } from './components/trading/OrderTicketModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { LoginModal } from './components/auth/LoginModal';

import { CockpitDashboard } from './pages/CockpitDashboard';
import { MarketsPage } from './pages/MarketsPage';
import { WatchlistsPage } from './pages/WatchlistsPage';
import { SignalsPage } from './pages/SignalsPage';
import { DeepDivePage } from './pages/DeepDivePage';
import { ChartStudioPage } from './pages/ChartStudioPage';
import { MarketReplayPage } from './pages/MarketReplayPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { PaperTradingPage } from './pages/PaperTradingPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TradeJournalPage } from './pages/TradeJournalPage';
import { RiskConsolePage } from './pages/RiskConsolePage';
import { NewsPage } from './pages/NewsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const {
    currentPage,
    selectedSignal,
    isSignalDrawerOpen,
    setIsSignalDrawerOpen,
    toasts
  } = useUI();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <CockpitDashboard />;
      case 'markets':
        return <MarketsPage />;
      case 'watchlist':
        return <WatchlistsPage />;
      case 'signals':
        return <SignalsPage />;
      case 'deepdive':
        return <DeepDivePage />;
      case 'charts':
        return <ChartStudioPage />;
      case 'replay':
        return <MarketReplayPage />;
      case 'backtest':
        return <BacktestingPage />;
      case 'strategies':
        return <StrategiesPage />;
      case 'papertrading':
        return <PaperTradingPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'journal':
        return <TradeJournalPage />;
      case 'risk':
        return <RiskConsolePage />;
      case 'news':
        return <NewsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'health':
        return <SystemHealthPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <CockpitDashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-0 text-fg-0">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Workspace: Left Sidebar + Page View */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-bg-0">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Telemetry Status Bar */}
      <StatusBar />

      {/* Global Modals & Drawers */}
      <CommandPalette />
      <SignalDetailDrawer
        signal={selectedSignal}
        isOpen={isSignalDrawerOpen}
        onClose={() => setIsSignalDrawerOpen(false)}
      />
      <OrderTicketModal />
      <LoginModal />

      {/* Toast Notification Container */}
      <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                : t.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                : 'bg-bg-1/95 text-fg-1 border-border'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <UIProvider>
        <TradingProvider>
          <MarketProvider>
            <AppContent />
          </MarketProvider>
        </TradingProvider>
      </UIProvider>
    </AuthProvider>
  );
};

export default App;
