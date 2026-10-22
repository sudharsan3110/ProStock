import React, { createContext, useContext, useState, useEffect } from 'react';
import { PaperAccount, Position, PaperOrder, Direction } from '../types';
import { tradingApi } from '../api/tradingApi';

interface TradingContextType {
  account: PaperAccount | null;
  positions: Position[];
  orders: PaperOrder[];
  executeOrder: (order: { symbol: string; direction: Direction; quantity: number; price: number; stopLoss: number; targetPrice: number }) => void;
  closePosition: (positionId: string) => void;
  cancelOrder: (orderId: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);

  useEffect(() => {
    tradingApi.getPortfolio().then(data => {
      setAccount(data.account);
      setPositions(data.positions);
      setOrders(data.orders);
    }).catch(console.error);
  }, []);

  const executeOrder = (orderData: { symbol: string; direction: Direction; quantity: number; price: number; stopLoss: number; targetPrice: number }) => {
    const newPosId = `POS-${Date.now().toString().slice(-4)}`;
    const newOrderId = `ORD-${Date.now().toString().slice(-4)}`;

    const newPosition: Position = {
      id: newPosId,
      symbol: orderData.symbol,
      direction: orderData.direction,
      quantity: orderData.quantity,
      avgEntryPrice: orderData.price,
      currentPrice: orderData.price,
      marketValue: Math.round(orderData.price * orderData.quantity * 100) / 100,
      pnl: 0,
      pnlPercent: 0,
      stopLoss: orderData.stopLoss,
      targetPrice: orderData.targetPrice,
      rMultiple: 0,
      entryTime: new Date().toISOString()
    };

    const newOrder: PaperOrder = {
      id: newOrderId,
      symbol: orderData.symbol,
      side: orderData.direction === 'LONG' ? 'BUY' : 'SELL',
      type: 'LIMIT',
      quantity: orderData.quantity,
      price: orderData.price,
      status: 'FILLED',
      filledQuantity: orderData.quantity,
      timestamp: new Date().toISOString()
    };

    setPositions(prev => [newPosition, ...prev]);
    setOrders(prev => [newOrder, ...prev]);

    // Update account margin and heat
    if (account) {
      const margin = Math.round(orderData.price * orderData.quantity * 0.2);
      setAccount(prev => prev ? {
        ...prev,
        marginUsed: prev.marginUsed + margin,
        marginAvailable: Math.max(0, prev.marginAvailable - margin),
        portfolioHeatPercent: Math.min(prev.maxAllowedHeatPercent, Math.round((prev.portfolioHeatPercent + 1.2) * 10) / 10)
      } : null);
    }
  };

  const closePosition = (positionId: string) => {
    setPositions(prev => prev.filter(p => p.id !== positionId));
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
  };

  return (
    <TradingContext.Provider
      value={{
        account,
        positions,
        orders,
        executeOrder,
        closePosition,
        cancelOrder
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within a TradingProvider');
  return context;
};
