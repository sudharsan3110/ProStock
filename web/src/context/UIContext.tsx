import React, { createContext, useContext, useState, useEffect } from 'react';
import { Signal } from '../types';

export type PageId =
  | 'dashboard'
  | 'markets'
  | 'watchlist'
  | 'signals'
  | 'deepdive'
  | 'charts'
  | 'replay'
  | 'backtest'
  | 'strategies'
  | 'papertrading'
  | 'portfolio'
  | 'journal'
  | 'risk'
  | 'news'
  | 'calendar'
  | 'health'
  | 'settings';

interface OrderTicketData {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  stopLoss: number;
  targetPrice: number;
  suggestedQty: number;
}

interface UIContextType {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  selectedSignal: Signal | null;
  setSelectedSignal: (sig: Signal | null) => void;
  isSignalDrawerOpen: boolean;
  setIsSignalDrawerOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  orderTicketData: OrderTicketData | null;
  openOrderTicket: (data: OrderTicketData) => void;
  closeOrderTicket: () => void;
  isKillSwitchModalOpen: boolean;
  setIsKillSwitchModalOpen: (open: boolean) => void;
  density: 'comfortable' | 'compact' | 'ultra';
  setDensity: (d: 'comfortable' | 'compact' | 'ultra') => void;
  theme: 'dark' | 'black';
  setTheme: (t: 'dark' | 'black') => void;
  toasts: { id: string; message: string; type: 'success' | 'warn' | 'error' | 'info' }[];
  addToast: (message: string, type?: 'success' | 'warn' | 'error' | 'info') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isSignalDrawerOpen, setIsSignalDrawerOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [orderTicketData, setOrderTicketData] = useState<OrderTicketData | null>(null);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState<boolean>(false);
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'ultra'>('comfortable');
  const [theme, setTheme] = useState<'dark' | 'black'>('dark');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warn' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'warn' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const openOrderTicket = (data: OrderTicketData) => {
    setOrderTicketData(data);
  };

  const closeOrderTicket = () => {
    setOrderTicketData(null);
  };

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsSignalDrawerOpen(false);
        setOrderTicketData(null);
        setIsKillSwitchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <UIContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        selectedSignal,
        setSelectedSignal,
        isSignalDrawerOpen,
        setIsSignalDrawerOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        orderTicketData,
        openOrderTicket,
        closeOrderTicket,
        isKillSwitchModalOpen,
        setIsKillSwitchModalOpen,
        density,
        setDensity,
        theme,
        setTheme,
        toasts,
        addToast
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
